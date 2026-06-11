//! Minimal SEP-41 token used to seed a XLM/USDC liquidity pool on Soroban
//! Testnet for the SCF #42 demo of Deliverable 6 (Stellar Broker integration).
//!
//! Not for production. Allowance-less mint and admin-restricted burn keep the
//! contract under 1 KB WASM and easy to audit on testnet.
//!
//! Standard SEP-41 / soroban-sdk TokenInterface so Soroswap, Phoenix, and Aqua
//! all recognize the token and let us LP it against XLM.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contractmeta, contracttype, panic_with_error, symbol_short, Address,
    Env, String,
};
use soroban_sdk::token::TokenInterface;
use soroban_sdk::contracterror;

contractmeta!(
    key = "Description",
    val = "SEP-41 test USDC for SCF #42 Tranche 2 demo"
);

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Decimals,
    Name,
    Symbol,
    Balance(Address),
    Allowance(Address, Address),
    AllowanceLive(Address, Address),
    TotalSupply,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum TokenError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InsufficientBalance = 4,
    InsufficientAllowance = 5,
    NegativeAmount = 6,
    AllowanceExpired = 7,
}

#[contract]
pub struct TestUsdc;

#[contractimpl]
impl TestUsdc {
    /// One-time setup. `admin` can mint freely afterwards.
    pub fn initialize(env: Env, admin: Address, decimal: u32, name: String, symbol: String) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, TokenError::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Decimals, &decimal);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
        env.storage().instance().set(&DataKey::TotalSupply, &0i128);
    }

    /// Admin-only mint. Useful to seed an LP wallet during testnet setup.
    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin = read_admin(&env);
        admin.require_auth();
        check_nonnegative(&env, amount);
        let balance = read_balance(&env, &to);
        write_balance(&env, &to, balance + amount);
        let supply: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(supply + amount));
        env.events()
            .publish((symbol_short!("mint"), to.clone()), amount);
    }

    pub fn set_admin(env: Env, new_admin: Address) {
        let admin = read_admin(&env);
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
    }

    pub fn admin(env: Env) -> Address {
        read_admin(&env)
    }
}

#[contractimpl]
impl TokenInterface for TestUsdc {
    fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        let key = DataKey::Allowance(from.clone(), spender.clone());
        let live_key = DataKey::AllowanceLive(from, spender);
        let live: u32 = env.storage().temporary().get(&live_key).unwrap_or(0);
        if live < env.ledger().sequence() {
            return 0;
        }
        env.storage().temporary().get(&key).unwrap_or(0)
    }

    fn approve(env: Env, from: Address, spender: Address, amount: i128, live_until_ledger: u32) {
        from.require_auth();
        check_nonnegative(&env, amount);
        let key = DataKey::Allowance(from.clone(), spender.clone());
        let live_key = DataKey::AllowanceLive(from.clone(), spender.clone());
        env.storage().temporary().set(&key, &amount);
        env.storage().temporary().set(&live_key, &live_until_ledger);
        env.events().publish(
            (symbol_short!("approve"), from, spender),
            (amount, live_until_ledger),
        );
    }

    fn balance(env: Env, id: Address) -> i128 {
        read_balance(&env, &id)
    }

    fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        check_nonnegative(&env, amount);
        spend_balance(&env, &from, amount);
        let to_balance = read_balance(&env, &to);
        write_balance(&env, &to, to_balance + amount);
        env.events()
            .publish((symbol_short!("transfer"), from, to), amount);
    }

    fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        check_nonnegative(&env, amount);
        spend_allowance(&env, &from, &spender, amount);
        spend_balance(&env, &from, amount);
        let to_balance = read_balance(&env, &to);
        write_balance(&env, &to, to_balance + amount);
        env.events()
            .publish((symbol_short!("transfer"), from, to), amount);
    }

    fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();
        check_nonnegative(&env, amount);
        spend_balance(&env, &from, amount);
        let supply: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(supply - amount));
        env.events()
            .publish((symbol_short!("burn"), from), amount);
    }

    fn burn_from(env: Env, spender: Address, from: Address, amount: i128) {
        spender.require_auth();
        check_nonnegative(&env, amount);
        spend_allowance(&env, &from, &spender, amount);
        spend_balance(&env, &from, amount);
        let supply: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(supply - amount));
        env.events()
            .publish((symbol_short!("burn"), from), amount);
    }

    fn decimals(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Decimals)
            .unwrap_or(7)
    }

    fn name(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Name)
            .unwrap_or_else(|| String::from_str(&env, ""))
    }

    fn symbol(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Symbol)
            .unwrap_or_else(|| String::from_str(&env, ""))
    }
}

// ── Internals ───────────────────────────────────────────────────────────────

fn read_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .unwrap_or_else(|| panic_with_error!(env, TokenError::NotInitialized))
}

fn read_balance(env: &Env, id: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::Balance(id.clone()))
        .unwrap_or(0)
}

fn write_balance(env: &Env, id: &Address, amount: i128) {
    env.storage()
        .persistent()
        .set(&DataKey::Balance(id.clone()), &amount);
}

fn spend_balance(env: &Env, id: &Address, amount: i128) {
    let balance = read_balance(env, id);
    if balance < amount {
        panic_with_error!(env, TokenError::InsufficientBalance);
    }
    write_balance(env, id, balance - amount);
}

fn spend_allowance(env: &Env, from: &Address, spender: &Address, amount: i128) {
    let allowance_key = DataKey::Allowance(from.clone(), spender.clone());
    let live_key = DataKey::AllowanceLive(from.clone(), spender.clone());
    let live: u32 = env.storage().temporary().get(&live_key).unwrap_or(0);
    if live < env.ledger().sequence() {
        panic_with_error!(env, TokenError::AllowanceExpired);
    }
    let allowance: i128 = env.storage().temporary().get(&allowance_key).unwrap_or(0);
    if allowance < amount {
        panic_with_error!(env, TokenError::InsufficientAllowance);
    }
    env.storage()
        .temporary()
        .set(&allowance_key, &(allowance - amount));
}

fn check_nonnegative(env: &Env, amount: i128) {
    if amount < 0 {
        panic_with_error!(env, TokenError::NegativeAmount);
    }
}
