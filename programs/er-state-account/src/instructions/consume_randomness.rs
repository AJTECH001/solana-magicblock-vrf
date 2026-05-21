use anchor_lang::prelude::*;
use crate::state::UserAccount;

#[derive(Accounts)]
pub struct ConsumeRandomness<'info> {
    /// This check ensure that the vrf_program_identity (which is a PDA) is a singer
    /// enforcing the callback is executed by the VRF program trough CPI
    #[account(address = ephemeral_vrf_sdk::consts::VRF_PROGRAM_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,
    #[account(
        mut,
        seeds = [b"user", user_account.user.as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,
}

impl<'info> ConsumeRandomness<'info> {
    pub fn consume_randomness(&mut self, randomness: [u8; 32]) -> Result<()> {
        let user_account = &mut self.user_account;
        
        // Ensure the account is in the correct status
        if user_account.status != 1 {
            return Err(ErrorCode::InvalidStatus.into());
        }

        // Use the randomness to update the user state
        // Generate a random number between 1 and 100
        let random_val = ephemeral_vrf_sdk::rnd::random_u8_with_range(&randomness, 1, 101) as u64;
        
        user_account.random_number = random_val;
        user_account.score += random_val;
        user_account.reward = random_val * 10;
        user_account.status = 2; // 2: Fulfilled

        Ok(())
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid status for consuming randomness")]
    InvalidStatus,
}
