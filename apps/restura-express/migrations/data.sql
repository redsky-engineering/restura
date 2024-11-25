-- Avoid notice from truncating tables with foreign keys
SET client_min_messages = WARNING;

-- Remove all old data
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(table_record.tablename) || ' CASCADE;';
    END LOOP;
END $$;

-- Add new data
INSERT INTO public.company (id, "createdOn", "modifiedOn", name)
		VALUES(1, '2024-10-13 17:35:45.989731 +00:00', '2024-10-13 17:35:45.989731 +00:00', 'redsky');

INSERT INTO public. "user" (id, "createdOn", "modifiedOn", "firstName", "lastName", "companyId", PASSWORD, email, ROLE, "permissionLogin", "lastLoginOn", phone, "loginDisabledOn", "passwordResetGuid", "verifyEmailPin", "verifyEmailPinExpiresOn", "accountStatus", "passwordResetExpiresOn", "onboardingStatus", "pendingEmail", "testAge", metadata)
		VALUES(1, '2024-10-08 20:53:30.663673 +00:00', '2024-10-29 22:38:16.029000 +00:00', 'Tanner', 'Burton', 1, 'asdfa', 'tanner@plvr.com', 'user', TRUE, NULL, NULL, NULL, NULL, NULL, NULL, 'view_only', NULL, 'verify_email', NULL, 0, '{}');

INSERT INTO public. "user" (id, "createdOn", "modifiedOn", "firstName", "lastName", "companyId", PASSWORD, email, ROLE, "permissionLogin", "lastLoginOn", phone, "loginDisabledOn", "passwordResetGuid", "verifyEmailPin", "verifyEmailPinExpiresOn", "accountStatus", "passwordResetExpiresOn", "onboardingStatus", "pendingEmail", "testAge", metadata)
		VALUES(12, '2024-10-08 20:55:45.580415 +00:00', '2024-10-08 20:55:45.580415 +00:00', 'Billy', 'Bob', 1, 'asdfa', 'billy1@plvr.com', 'user', TRUE, NULL, NULL, NULL, NULL, NULL, NULL, 'view_only', NULL, 'verify_email', NULL, 0, '{}');