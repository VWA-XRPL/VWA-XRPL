use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

declare_id!("VWASo1ana1111111111111111111111111111111111");

#[program]
pub mod vwa_solana {
    use super::*;

    // Initialize a new precious asset
    pub fn initialize_asset(
        ctx: Context<InitializeAsset>,
        asset_type: AssetType,
        weight: u64,
        purity: u8,
        certification: String,
        initial_price: u64,
    ) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        asset.owner = ctx.accounts.owner.key();
        asset.asset_type = asset_type;
        asset.weight = weight;
        asset.purity = purity;
        asset.certification = certification;
        asset.current_price = initial_price;
        asset.created_at = Clock::get()?.unix_timestamp;
        asset.is_active = true;
        
        Ok(())
    }

    // Update asset price
    pub fn update_price(ctx: Context<UpdatePrice>, new_price: u64) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        require!(asset.owner == ctx.accounts.owner.key(), ErrorCode::Unauthorized);
        
        asset.current_price = new_price;
        asset.last_price_update = Clock::get()?.unix_timestamp;
        
        Ok(())
    }

    // Create a trade order
    pub fn create_trade_order(
        ctx: Context<CreateTradeOrder>,
        order_type: OrderType,
        quantity: u64,
        price_per_unit: u64,
    ) -> Result<()> {
        let order = &mut ctx.accounts.order;
        order.asset = ctx.accounts.asset.key();
        order.owner = ctx.accounts.owner.key();
        order.order_type = order_type;
        order.quantity = quantity;
        order.price_per_unit = price_per_unit;
        order.created_at = Clock::get()?.unix_timestamp;
        order.is_active = true;
        
        Ok(())
    }

    // Execute a trade
    pub fn execute_trade(ctx: Context<ExecuteTrade>) -> Result<()> {
        let order = &mut ctx.accounts.order;
        let asset = &mut ctx.accounts.asset;
        
        require!(order.is_active, ErrorCode::OrderInactive);
        require!(order.quantity > 0, ErrorCode::InvalidQuantity);
        
        // Transfer tokens
        let transfer_instruction = Transfer {
            from: ctx.accounts.from_token_account.to_account_info(),
            to: ctx.accounts.to_token_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );
        
        token::transfer(cpi_ctx, order.quantity)?;
        
        // Update order
        order.quantity = 0;
        order.is_active = false;
        
        // Update asset ownership
        asset.owner = ctx.accounts.buyer.key();
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeAsset<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Asset::INIT_SPACE,
        seeds = [b"asset", owner.key().as_ref(), &asset_type.to_bytes()],
        bump
    )]
    pub asset: Account<'info, Asset>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    #[account(mut)]
    pub asset: Account<'info, Asset>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateTradeOrder<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + TradeOrder::INIT_SPACE,
        seeds = [b"order", owner.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub order: Account<'info, TradeOrder>,
    #[account(mut)]
    pub asset: Account<'info, Asset>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteTrade<'info> {
    #[account(mut)]
    pub order: Account<'info, TradeOrder>,
    #[account(mut)]
    pub asset: Account<'info, Asset>,
    #[account(mut)]
    pub from_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to_token_account: Account<'info, TokenAccount>,
    pub owner: Signer<'info>,
    pub buyer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct Asset {
    pub owner: Pubkey,
    pub asset_type: AssetType,
    pub weight: u64, // in milligrams for precision
    pub purity: u8,  // percentage (0-100)
    pub certification: String,
    pub current_price: u64, // in lamports
    pub created_at: i64,
    pub last_price_update: i64,
    pub is_active: bool,
}

#[account]
#[derive(InitSpace)]
pub struct TradeOrder {
    pub asset: Pubkey,
    pub owner: Pubkey,
    pub order_type: OrderType,
    pub quantity: u64,
    pub price_per_unit: u64,
    pub created_at: i64,
    pub is_active: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum AssetType {
    Gold,
    Silver,
    Platinum,
    Palladium,
    Diamond,
    Ruby,
    Emerald,
    Sapphire,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum OrderType {
    Buy,
    Sell,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Order is inactive")]
    OrderInactive,
    #[msg("Invalid quantity")]
    InvalidQuantity,
}
