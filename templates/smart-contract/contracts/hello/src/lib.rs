#![no_std]

use soroban_sdk::{contract, contractimpl, String};

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn hello(name: String) -> String {
        name
    }
}

mod test;
