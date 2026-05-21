use anchor_lang::prelude::*;

#[account]
pub struct UserAccount {
    pub user: Pubkey,
    pub data: u64,
    pub score: u64,
    pub random_number: u64,
    pub status: u8,
    pub reward: u64,
    pub bump: u8,
}

impl Space for UserAccount {
    const INIT_SPACE: usize = 32 + 8 + 8 + 8 + 1 + 8 + 1 + 8; // Pubkey + data + score + random_number + status + reward + bump + 8 bytes for account discriminator
}