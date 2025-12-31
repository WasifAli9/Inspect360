CREATE TYPE "public"."community_flag_reason" AS ENUM('spam', 'offensive', 'harassment', 'misinformation', 'other');--> statement-breakpoint
CREATE TYPE "public"."community_group_status" AS ENUM('pending', 'approved', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."community_moderation_action" AS ENUM('approved', 'rejected', 'hidden', 'restored', 'removed', 'warned');--> statement-breakpoint
CREATE TYPE "public"."community_post_status" AS ENUM('visible', 'hidden', 'flagged', 'removed');--> statement-breakpoint
CREATE TYPE "public"."limit_type" AS ENUM('active_tenants', 'work_orders', 'disputes');--> statement-breakpoint
CREATE TYPE "public"."override_type" AS ENUM('subscription', 'module', 'addon');--> statement-breakpoint
ALTER TYPE "public"."credit_source" ADD VALUE 'addon_pack';--> statement-breakpoint
ALTER TYPE "public"."field_type" ADD VALUE 'auto_inspection_date';--> statement-breakpoint
ALTER TYPE "public"."field_type" ADD VALUE 'auto_inspector';--> statement-breakpoint
ALTER TYPE "public"."field_type" ADD VALUE 'auto_address';--> statement-breakpoint
ALTER TYPE "public"."field_type" ADD VALUE 'auto_tenant_names';--> statement-breakpoint
ALTER TYPE "public"."plan_code" ADD VALUE 'growth' BEFORE 'professional';--> statement-breakpoint
CREATE TABLE "addon_pack_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"inspection_quantity" integer NOT NULL,
	"pack_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "addon_pack_pricing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" varchar NOT NULL,
	"tier_id" varchar NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"price_per_inspection" integer NOT NULL,
	"total_pack_price" integer NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bundle_modules_junction" (
	"bundle_id" varchar NOT NULL,
	"module_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bundle_pricing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bundle_id" varchar NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"price_monthly" integer NOT NULL,
	"price_annual" integer NOT NULL,
	"savings_monthly" integer,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_group_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" varchar NOT NULL,
	"tenant_id" varchar NOT NULL,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_groups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"block_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"cover_image_url" varchar,
	"status" "community_group_status" DEFAULT 'pending' NOT NULL,
	"created_by" varchar NOT NULL,
	"rule_version_agreed_at" integer,
	"approved_by" varchar,
	"approved_at" timestamp,
	"rejection_reason" text,
	"member_count" integer DEFAULT 0,
	"post_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_rule_acceptances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"rule_version" integer NOT NULL,
	"accepted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"rules_text" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_tenant_blocks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"tenant_user_id" varchar NOT NULL,
	"blocked_by_user_id" varchar NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_threads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" varchar NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"created_by" varchar NOT NULL,
	"status" "community_post_status" DEFAULT 'visible' NOT NULL,
	"is_pinned" boolean DEFAULT false,
	"is_locked" boolean DEFAULT false,
	"view_count" integer DEFAULT 0,
	"reply_count" integer DEFAULT 0,
	"last_activity_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "currency_config" (
	"code" varchar(3) PRIMARY KEY NOT NULL,
	"symbol" varchar(5) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"default_for_region" varchar(50),
	"conversion_rate" numeric(10, 4) DEFAULT '1.0000',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extensive_inspection_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"image_count" integer DEFAULT 800,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extensive_inspection_pricing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"extensive_type_id" varchar NOT NULL,
	"tier_id" varchar NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"price_per_inspection" integer NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "instance_addon_purchases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" varchar NOT NULL,
	"pack_id" varchar NOT NULL,
	"tier_id_at_purchase" varchar NOT NULL,
	"quantity" integer NOT NULL,
	"price_per_inspection" integer NOT NULL,
	"total_price" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"purchase_date" timestamp DEFAULT now(),
	"expiry_date" timestamp,
	"inspections_used" integer DEFAULT 0,
	"inspections_remaining" integer NOT NULL,
	"status" varchar(20) DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "instance_bundles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" varchar NOT NULL,
	"bundle_id" varchar NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"bundle_price_monthly" integer,
	"bundle_price_annual" integer,
	"currency_code" varchar(3)
);
--> statement-breakpoint
CREATE TABLE "instance_module_overrides" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" varchar NOT NULL,
	"module_id" varchar NOT NULL,
	"override_monthly_price" integer,
	"override_annual_price" integer,
	"override_reason" text,
	"override_set_by" varchar,
	"override_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instance_modules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" varchar NOT NULL,
	"module_id" varchar NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"enabled_date" timestamp,
	"disabled_date" timestamp,
	"billing_start_date" timestamp,
	"monthly_price" integer,
	"annual_price" integer,
	"currency_code" varchar(3),
	"usage_limit" integer,
	"current_usage" integer DEFAULT 0,
	"overage_charges" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "instance_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"registration_currency" varchar(3) NOT NULL,
	"current_tier_id" varchar,
	"inspection_quota_included" integer NOT NULL,
	"billing_cycle" "billing_interval" DEFAULT 'monthly' NOT NULL,
	"subscription_start_date" timestamp DEFAULT now(),
	"subscription_renewal_date" timestamp,
	"subscription_status" varchar(20) DEFAULT 'active',
	"override_monthly_fee" integer,
	"override_annual_fee" integer,
	"override_reason" text,
	"override_set_by" varchar,
	"override_date" timestamp,
	CONSTRAINT "instance_subscriptions_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "marketplace_modules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"module_key" varchar(50) NOT NULL,
	"description" text,
	"icon_name" varchar(50),
	"is_available_globally" boolean DEFAULT true NOT NULL,
	"default_enabled" boolean DEFAULT false NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "marketplace_modules_module_key_unique" UNIQUE("module_key")
);
--> statement-breakpoint
CREATE TABLE "module_bundles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"discount_percentage" numeric(5, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "module_limits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" varchar NOT NULL,
	"limit_type" "limit_type" NOT NULL,
	"included_quantity" integer NOT NULL,
	"overage_price" integer NOT NULL,
	"overage_currency" varchar(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_pricing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" varchar NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"price_monthly" integer NOT NULL,
	"price_annual" integer NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pricing_override_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" varchar NOT NULL,
	"override_type" "override_type" NOT NULL,
	"target_id" varchar NOT NULL,
	"old_price_monthly" integer,
	"new_price_monthly" integer,
	"old_price_annual" integer,
	"new_price_annual" integer,
	"reason" text,
	"changed_by" varchar,
	"change_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscription_tiers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" "plan_code" NOT NULL,
	"tier_order" integer NOT NULL,
	"included_inspections" integer NOT NULL,
	"base_price_monthly" integer NOT NULL,
	"base_price_annual" integer NOT NULL,
	"annual_discount_percentage" numeric(5, 2) DEFAULT '16.70',
	"is_active" boolean DEFAULT true NOT NULL,
	"requires_custom_pricing" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subscription_tiers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "tier_pricing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier_id" varchar NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"price_monthly" integer NOT NULL,
	"price_annual" integer NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "inspections" ADD COLUMN "tenant_approval_status" varchar;--> statement-breakpoint
ALTER TABLE "inspections" ADD COLUMN "tenant_approval_deadline" timestamp;--> statement-breakpoint
ALTER TABLE "inspections" ADD COLUMN "tenant_approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "inspections" ADD COLUMN "tenant_approved_by" varchar;--> statement-breakpoint
ALTER TABLE "inspections" ADD COLUMN "tenant_comments" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "tenant_portal_community_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "tenant_portal_comparison_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "tenant_portal_chatbot_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "tenant_portal_maintenance_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "check_in_approval_period_days" integer DEFAULT 5;--> statement-breakpoint
ALTER TABLE "addon_pack_pricing" ADD CONSTRAINT "addon_pack_pricing_pack_id_addon_pack_config_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."addon_pack_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addon_pack_pricing" ADD CONSTRAINT "addon_pack_pricing_tier_id_subscription_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."subscription_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addon_pack_pricing" ADD CONSTRAINT "addon_pack_pricing_currency_code_currency_config_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currency_config"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_modules_junction" ADD CONSTRAINT "bundle_modules_junction_bundle_id_module_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."module_bundles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_modules_junction" ADD CONSTRAINT "bundle_modules_junction_module_id_marketplace_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."marketplace_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_pricing" ADD CONSTRAINT "bundle_pricing_bundle_id_module_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."module_bundles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_pricing" ADD CONSTRAINT "bundle_pricing_currency_code_currency_config_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currency_config"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extensive_inspection_pricing" ADD CONSTRAINT "extensive_inspection_pricing_extensive_type_id_extensive_inspection_config_id_fk" FOREIGN KEY ("extensive_type_id") REFERENCES "public"."extensive_inspection_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extensive_inspection_pricing" ADD CONSTRAINT "extensive_inspection_pricing_tier_id_subscription_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."subscription_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extensive_inspection_pricing" ADD CONSTRAINT "extensive_inspection_pricing_currency_code_currency_config_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currency_config"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_addon_purchases" ADD CONSTRAINT "instance_addon_purchases_instance_id_instance_subscriptions_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instance_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_addon_purchases" ADD CONSTRAINT "instance_addon_purchases_pack_id_addon_pack_config_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."addon_pack_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_addon_purchases" ADD CONSTRAINT "instance_addon_purchases_tier_id_at_purchase_subscription_tiers_id_fk" FOREIGN KEY ("tier_id_at_purchase") REFERENCES "public"."subscription_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_addon_purchases" ADD CONSTRAINT "instance_addon_purchases_currency_code_currency_config_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currency_config"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_bundles" ADD CONSTRAINT "instance_bundles_instance_id_instance_subscriptions_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instance_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_bundles" ADD CONSTRAINT "instance_bundles_bundle_id_module_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."module_bundles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_bundles" ADD CONSTRAINT "instance_bundles_currency_code_currency_config_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currency_config"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_module_overrides" ADD CONSTRAINT "instance_module_overrides_instance_id_instance_subscriptions_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instance_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_module_overrides" ADD CONSTRAINT "instance_module_overrides_module_id_marketplace_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."marketplace_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_module_overrides" ADD CONSTRAINT "instance_module_overrides_override_set_by_admin_users_id_fk" FOREIGN KEY ("override_set_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_modules" ADD CONSTRAINT "instance_modules_instance_id_instance_subscriptions_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instance_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_modules" ADD CONSTRAINT "instance_modules_module_id_marketplace_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."marketplace_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_modules" ADD CONSTRAINT "instance_modules_currency_code_currency_config_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currency_config"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_subscriptions" ADD CONSTRAINT "instance_subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_subscriptions" ADD CONSTRAINT "instance_subscriptions_registration_currency_currency_config_code_fk" FOREIGN KEY ("registration_currency") REFERENCES "public"."currency_config"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_subscriptions" ADD CONSTRAINT "instance_subscriptions_current_tier_id_subscription_tiers_id_fk" FOREIGN KEY ("current_tier_id") REFERENCES "public"."subscription_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_subscriptions" ADD CONSTRAINT "instance_subscriptions_override_set_by_admin_users_id_fk" FOREIGN KEY ("override_set_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_limits" ADD CONSTRAINT "module_limits_module_id_marketplace_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."marketplace_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_limits" ADD CONSTRAINT "module_limits_overage_currency_currency_config_code_fk" FOREIGN KEY ("overage_currency") REFERENCES "public"."currency_config"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_pricing" ADD CONSTRAINT "module_pricing_module_id_marketplace_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."marketplace_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_pricing" ADD CONSTRAINT "module_pricing_currency_code_currency_config_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currency_config"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_override_history" ADD CONSTRAINT "pricing_override_history_instance_id_instance_subscriptions_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instance_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_override_history" ADD CONSTRAINT "pricing_override_history_changed_by_admin_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_pricing" ADD CONSTRAINT "tier_pricing_tier_id_subscription_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."subscription_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_pricing" ADD CONSTRAINT "tier_pricing_currency_code_currency_config_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currency_config"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_group_members_group" ON "community_group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_group_members_tenant" ON "community_group_members" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_community_groups_org" ON "community_groups" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_community_groups_block" ON "community_groups" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "idx_community_groups_status" ON "community_groups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_community_groups_creator" ON "community_groups" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_rule_acceptances_tenant" ON "community_rule_acceptances" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_rule_acceptances_org" ON "community_rule_acceptances" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_community_rules_org" ON "community_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_community_rules_active" ON "community_rules" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_tenant_blocks_org" ON "community_tenant_blocks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_blocks_tenant" ON "community_tenant_blocks" USING btree ("tenant_user_id");--> statement-breakpoint
CREATE INDEX "idx_community_threads_group" ON "community_threads" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_community_threads_creator" ON "community_threads" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_community_threads_status" ON "community_threads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_community_threads_activity" ON "community_threads" USING btree ("last_activity_at");