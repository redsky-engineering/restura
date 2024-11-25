-- Drop all tables, triggers, types, and data
-- Then recreate the schema
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Create the ENUM types
CREATE TYPE role_enum AS ENUM ( 'admin',
	'user'
);

CREATE TYPE account_status_enum AS ENUM ( 'banned',
	'view_only',
	'active'
);

CREATE TYPE onboarding_status_enum AS ENUM ( 'verify_email',
	'complete'
);

-- Create the company table
CREATE TABLE "company" (
	"id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"createdOn" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
	"modifiedOn" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
	"name" VARCHAR(255) NULL
);

-- Create the user table with ENUMs for role, accountStatus, and onboardingStatus
CREATE TABLE "user" (
	"id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"createdOn" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
	"modifiedOn" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
	"firstName" VARCHAR(30) NOT NULL,
	"lastName" VARCHAR(30) NOT NULL,
	"companyId" BIGINT NOT NULL,
	"password" VARCHAR(70) NOT NULL,
	"email" VARCHAR(100) NOT NULL,
	"role" role_enum NOT NULL,
	"permissionLogin" BOOLEAN DEFAULT TRUE NOT NULL,
	"lastLoginOn" TIMESTAMPTZ NULL,
	"phone" VARCHAR(30) NULL,
	"loginDisabledOn" TIMESTAMPTZ NULL,
	"passwordResetGuid" VARCHAR(100) NULL,
	"verifyEmailPin" INTEGER NULL,
	"verifyEmailPinExpiresOn" TIMESTAMPTZ NULL,
	"accountStatus" account_status_enum DEFAULT 'view_only' NOT NULL,
	"passwordResetExpiresOn" TIMESTAMPTZ NULL,
	"onboardingStatus" onboarding_status_enum DEFAULT 'verify_email' NOT NULL,
	"pendingEmail" VARCHAR(100) NULL,
	"testAge" INT DEFAULT 0 NULL,
	"metadata" JSONB DEFAULT '{}' NOT NULL,
	CONSTRAINT "user_email_unique_index" UNIQUE ("email"),
	CONSTRAINT "user_companyId_company_id_fk" FOREIGN KEY ("companyId") REFERENCES "company" ("id")
);

-- Create the item table
CREATE TABLE item (
	"id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"orderId" BIGINT NOT NULL
);

-- Create the order table
CREATE TABLE "order" (
	id bigserial CONSTRAINT order_pk PRIMARY KEY,
	"userId" bigint NOT NULL CONSTRAINT order_user_null_fk REFERENCES "user",
	"amountCents" bigint
);

-- Indexes
CREATE INDEX "user_companyId_index" ON "user" ("companyId");

CREATE INDEX "user_passwordResetGuid_index" ON "user" ("passwordResetGuid");

-- Add triggers to notify the channel when a record is inserted, updated, or deleted
CREATE FUNCTION notify_user_insert ()
	RETURNS TRIGGER
	LANGUAGE plpgsql
	AS $$
BEGIN
	PERFORM
		pg_notify('insert', json_build_object('table', 'user', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
	RETURN NEW;
END;
$$;

ALTER FUNCTION notify_user_insert () OWNER TO postgres;

CREATE TRIGGER user_insert
	AFTER INSERT ON "user" FOR EACH ROW
	EXECUTE PROCEDURE notify_user_insert ();

CREATE FUNCTION notify_username_insert ()
	RETURNS TRIGGER
	LANGUAGE plpgsql
	AS $$
BEGIN
	PERFORM
		pg_notify('user_insert', current_query());
RETURN NEW;
END;
$$;

ALTER FUNCTION notify_username_insert () OWNER TO postgres;

CREATE FUNCTION notify_user_update ()
	RETURNS TRIGGER
	LANGUAGE plpgsql
	AS $$
BEGIN
	PERFORM
		pg_notify('update', json_build_object('table', 'user', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
RETURN NEW;
END;
$$;

ALTER FUNCTION notify_user_update () OWNER TO postgres;

CREATE TRIGGER user_update
	AFTER UPDATE ON "user" FOR EACH ROW
	EXECUTE PROCEDURE notify_user_update ();

CREATE FUNCTION "notify_userOLD_insert" ()
	RETURNS TRIGGER
	LANGUAGE plpgsql
	AS $$
BEGIN
	PERFORM
		pg_notify('insert', json_build_object('table', 'user', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
RETURN NEW;
END;
$$;

ALTER FUNCTION "notify_userOLD_insert" () OWNER TO postgres;

CREATE FUNCTION notify_userold_insert ()
	RETURNS TRIGGER
	LANGUAGE plpgsql
	AS $$
BEGIN
	PERFORM
		pg_notify('insert', json_build_object('table', 'user', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
RETURN NEW;
END;
$$;

ALTER FUNCTION notify_userold_insert () OWNER TO postgres;

CREATE FUNCTION notify_order_delete ()
	RETURNS TRIGGER
	LANGUAGE plpgsql
	AS $$
BEGIN
	PERFORM
		pg_notify('delete', json_build_object('table', 'order', 'query', current_query(), 'record', NEW, 'previousRecord', OLD)::text);
RETURN NEW;
END;
$$;

ALTER FUNCTION notify_order_delete () OWNER TO postgres;

CREATE TRIGGER order_delete
	AFTER DELETE ON "order" FOR EACH ROW
	EXECUTE PROCEDURE notify_order_delete ();