-- Drop all tables, triggers, types, and data
-- Then recreate the schema
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

CREATE TABLE "item"
(    "id" BIGSERIAL PRIMARY KEY  NOT NULL,
     "createdOn" TIMESTAMPTZ NOT NULL DEFAULT now(),
     "modifiedOn" TIMESTAMPTZ NOT NULL DEFAULT now(),
     "orderId" BIGINT NOT NULL,
     "lastModifiedBy" BIGINT
);

CREATE TABLE "order"
(    "id" BIGSERIAL PRIMARY KEY  NOT NULL,
     "createdOn" TIMESTAMPTZ NOT NULL DEFAULT now(),
     "modifiedOn" TIMESTAMPTZ NOT NULL DEFAULT now(),
     "userId" BIGINT NOT NULL,
     "amountCents" BIGINT NOT NULL
);

CREATE TABLE "company"
(    "id" BIGSERIAL PRIMARY KEY  NOT NULL,
     "createdOn" TIMESTAMPTZ NOT NULL DEFAULT now(),
     "modifiedOn" TIMESTAMPTZ NOT NULL DEFAULT now(),
     "name" VARCHAR(255) NULL
);

CREATE TABLE "user"
(    "id" BIGSERIAL PRIMARY KEY  NOT NULL,
     "createdOn" TIMESTAMPTZ NOT NULL DEFAULT now(),
     "modifiedOn" TIMESTAMPTZ NOT NULL DEFAULT now(),
     "syncVersion" BIGINT NOT NULL DEFAULT 1,
     "firstName" VARCHAR(30) NOT NULL,
     "lastName" VARCHAR(30) NOT NULL,
     "companyId" BIGINT NOT NULL,
     "password" VARCHAR(70) NOT NULL,
     "email" VARCHAR(100) NOT NULL,
     "role" TEXT NOT NULL CHECK ("role" IN ('admin','user')),
     "permissionLogin" BOOLEAN NOT NULL DEFAULT true,
     "lastLoginOn" TIMESTAMPTZ NULL,
     "phone" VARCHAR(30) NULL,
     "loginDisabledOn" TIMESTAMPTZ NULL,
     "passwordResetGuid" VARCHAR(100) NULL,
     "verifyEmailPin" INT NULL,
     "verifyEmailPinExpiresOn" TIMESTAMPTZ NULL,
     "accountStatus" TEXT NOT NULL DEFAULT 'view_only' CHECK ("accountStatus" IN ('banned','view_only','active')),
     "passwordResetExpiresOn" TIMESTAMPTZ NULL,
     "onboardingStatus" TEXT NOT NULL DEFAULT 'verify_email' CHECK ("onboardingStatus" IN ('verify_email','complete')),
     "pendingEmail" VARCHAR(100) NULL,
     "testAge" INTEGER NOT NULL DEFAULT 0,
     "metadata" JSON NOT NULL DEFAULT '{}',
     "birthDate" DATE NULL
);

ALTER TABLE "item"       ADD CONSTRAINT "item_orderId_order_id_fk"
    FOREIGN KEY ("orderId") REFERENCES "order" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "order"      ADD CONSTRAINT "order_userId_user_id_fk"
    FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "user"       ADD CONSTRAINT "user_companyId_company_id_fk"
    FOREIGN KEY ("companyId") REFERENCES "company" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE  INDEX "item_orderId_index" ON "item" ("orderId" ASC);
CREATE  INDEX "order_userId_index" ON "order" ("userId" ASC);
CREATE  INDEX "user_companyId_index" ON "user" ("companyId" ASC);
CREATE UNIQUE INDEX "user_email_unique_index" ON "user" ("email" ASC);
CREATE  INDEX "user_passwordResetGuid_index" ON "user" ("passwordResetGuid" ASC);


CREATE OR REPLACE FUNCTION notify_order_insert()
    RETURNS TRIGGER AS $$
DECLARE
    query_metadata JSON;
BEGIN
    SELECT INTO query_metadata
        (regexp_match(
                current_query(),
                '^--QUERY_METADATA\(({.*})', 'n'
         ))[1]::json;

    PERFORM pg_notify(
            'insert',
            json_build_object(
                    'table', 'order',
                    'queryMetadata', query_metadata,
                    'insertedId', NEW.id,
                    'record', NEW
            )::text
            );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "order_insert"
    AFTER INSERT ON "order"
    FOR EACH ROW
EXECUTE FUNCTION notify_order_insert();


CREATE OR REPLACE FUNCTION notify_order_update()
    RETURNS TRIGGER AS $$
DECLARE
    query_metadata JSON;
BEGIN
    SELECT INTO query_metadata
        (regexp_match(
                current_query(),
                '^--QUERY_METADATA\(({.*})', 'n'
         ))[1]::json;

    PERFORM pg_notify(
            'update',
            json_build_object(
                    'table', 'order',
                    'queryMetadata', query_metadata,
                    'changedId', NEW.id,
                    'record', NEW,
                    'previousRecord', OLD
            )::text
            );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER order_update
    AFTER UPDATE ON "order"
    FOR EACH ROW
EXECUTE FUNCTION notify_order_update();


CREATE OR REPLACE FUNCTION notify_order_delete()
    RETURNS TRIGGER AS $$
DECLARE
    query_metadata JSON;
BEGIN
    SELECT INTO query_metadata
        (regexp_match(
                current_query(),
                '^--QUERY_METADATA\(({.*})', 'n'
         ))[1]::json;

    PERFORM pg_notify(
            'delete',
            json_build_object(
                    'table', 'order',
                    'queryMetadata', query_metadata,
                    'deletedId', OLD.id,
                    'previousRecord', OLD
            )::text
            );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "order_delete"
    AFTER DELETE ON "order"
    FOR EACH ROW
EXECUTE FUNCTION notify_order_delete();


CREATE OR REPLACE FUNCTION notify_company_insert()
    RETURNS TRIGGER AS $$
DECLARE
    query_metadata JSON;
BEGIN
    SELECT INTO query_metadata
        (regexp_match(
                current_query(),
                '^--QUERY_METADATA\(({.*})', 'n'
         ))[1]::json;

    PERFORM pg_notify(
            'insert',
            json_build_object(
                    'table', 'company',
                    'queryMetadata', query_metadata,
                    'insertedId', NEW.id,
                    'record', NEW
            )::text
            );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "company_insert"
    AFTER INSERT ON "company"
    FOR EACH ROW
EXECUTE FUNCTION notify_company_insert();


CREATE OR REPLACE FUNCTION notify_company_update()
    RETURNS TRIGGER AS $$
DECLARE
    query_metadata JSON;
BEGIN
    SELECT INTO query_metadata
        (regexp_match(
                current_query(),
                '^--QUERY_METADATA\(({.*})', 'n'
         ))[1]::json;

    PERFORM pg_notify(
            'update',
            json_build_object(
                    'table', 'company',
                    'queryMetadata', query_metadata,
                    'changedId', NEW.id,
                    'record', NEW,
                    'previousRecord', OLD
            )::text
            );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER company_update
    AFTER UPDATE ON "company"
    FOR EACH ROW
EXECUTE FUNCTION notify_company_update();


CREATE OR REPLACE FUNCTION notify_company_delete()
    RETURNS TRIGGER AS $$
DECLARE
    query_metadata JSON;
BEGIN
    SELECT INTO query_metadata
        (regexp_match(
                current_query(),
                '^--QUERY_METADATA\(({.*})', 'n'
         ))[1]::json;

    PERFORM pg_notify(
            'delete',
            json_build_object(
                    'table', 'company',
                    'queryMetadata', query_metadata,
                    'deletedId', OLD.id,
                    'previousRecord', OLD
            )::text
            );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "company_delete"
    AFTER DELETE ON "company"
    FOR EACH ROW
EXECUTE FUNCTION notify_company_delete();


CREATE OR REPLACE FUNCTION notify_user_insert()
    RETURNS TRIGGER AS $$
DECLARE
    query_metadata JSON;
BEGIN
    SELECT INTO query_metadata
        (regexp_match(
                current_query(),
                '^--QUERY_METADATA\(({.*})', 'n'
         ))[1]::json;

    PERFORM pg_notify(
            'insert',
            json_build_object(
                    'table', 'user',
                    'queryMetadata', query_metadata,
                    'insertedId', NEW.id,
                    'record', json_build_object(
                            'id', NEW."id",
                            'firstName', NEW."firstName",
                            'lastName', NEW."lastName",
                            'email', NEW."email",
                            'phone', NEW."phone"
                              )
            )::text
            );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "user_insert"
    AFTER INSERT ON "user"
    FOR EACH ROW
EXECUTE FUNCTION notify_user_insert();


CREATE OR REPLACE FUNCTION notify_user_update()
    RETURNS TRIGGER AS $$
DECLARE
    query_metadata JSON;
BEGIN
    SELECT INTO query_metadata
        (regexp_match(
                current_query(),
                '^--QUERY_METADATA\(({.*})', 'n'
         ))[1]::json;

    PERFORM pg_notify(
            'update',
            json_build_object(
                    'table', 'user',
                    'queryMetadata', query_metadata,
                    'changedId', NEW.id,
                    'record', json_build_object(
                            'id', NEW."id",
                            'firstName', NEW."firstName",
                            'lastName', NEW."lastName",
                            'email', NEW."email",
                            'phone', NEW."phone"
                              ),
                    'previousRecord', json_build_object(
                            'id', OLD."id",
                            'firstName', OLD."firstName",
                            'lastName', OLD."lastName",
                            'email', OLD."email",
                            'phone', OLD."phone"
                                      )
            )::text
            );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER user_update
    AFTER UPDATE ON "user"
    FOR EACH ROW
EXECUTE FUNCTION notify_user_update();


CREATE OR REPLACE FUNCTION notify_user_delete()
    RETURNS TRIGGER AS $$
DECLARE
    query_metadata JSON;
BEGIN
    SELECT INTO query_metadata
        (regexp_match(
                current_query(),
                '^--QUERY_METADATA\(({.*})', 'n'
         ))[1]::json;

    PERFORM pg_notify(
            'delete',
            json_build_object(
                    'table', 'user',
                    'queryMetadata', query_metadata,
                    'deletedId', OLD.id,
                    'previousRecord', json_build_object(
                            'id', OLD."id",
                            'firstName', OLD."firstName",
                            'lastName', OLD."lastName",
                            'email', OLD."email",
                            'phone', OLD."phone"
                                      )
            )::text
            );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "user_delete"
    AFTER DELETE ON "user"
    FOR EACH ROW
EXECUTE FUNCTION notify_user_delete();
