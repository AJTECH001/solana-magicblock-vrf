use anchor_lang::prelude::*;
use crate::state::UserAccount;
use ephemeral_vrf_sdk::anchor::vrf;
use ephemeral_vrf_sdk::instructions::{create_request_randomness_ix, RequestRandomnessParams};
use ephemeral_vrf_sdk::types::SerializableAccountMeta;

#[vrf]
#[derive(Accounts)]
pub struct RequestRandomness<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        has_one = user,
        seeds = [b"user", user.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,
    /// CHECK: The oracle queue
    #[account(mut, address = ephemeral_vrf_sdk::consts::DEFAULT_QUEUE)]
    pub oracle_queue: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> RequestRandomness<'info> {
    pub fn request_randomness(&mut self) -> Result<()> {
        let user_account = &mut self.user_account;
        user_account.status = 1; // 1: Requesting

        let ix = create_request_randomness_ix(RequestRandomnessParams {
            payer: self.user.key().to_bytes().into(),
            oracle_queue: self.oracle_queue.key().to_bytes().into(),
            callback_program_id: crate::ID.to_bytes().into(),
            // Anchor instruction discriminator for "consume_randomness"
            callback_discriminator: [116, 178, 142, 237, 246, 231, 232, 175].to_vec(),
            caller_seed: [0u8; 32],
            // Specify any account that is required by the callback
            accounts_metas: Some(vec![SerializableAccountMeta {
                pubkey: self.user_account.key().to_bytes().into(),
                is_signer: false,
                is_writable: true,
            }]),
            ..Default::default()
        });

        self.invoke_signed_vrf(&self.user.to_account_info(), &ix)?;

        Ok(())
    }
}
