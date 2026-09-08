#![cfg(test)]

use super::*;
use soroban_sdk::{Env, String};

#[test]
fn returns_the_supplied_greeting_target() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    let name = String::from_str(&env, "StellarForge");

    assert_eq!(client.hello(&name), name);
}
