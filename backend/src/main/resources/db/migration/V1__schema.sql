-- DevSync Phase 1 authoritative schema

CREATE TABLE app_users (
    id              UUID PRIMARY KEY,
    email           VARCHAR(320) NOT NULL,
    email_normalized VARCHAR(320) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    password_hash   VARCHAR(255),
    auth_provider   VARCHAR(32) NOT NULL,
    github_id       VARCHAR(64),
    avatar_url      VARCHAR(512),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_app_users_email_normalized UNIQUE (email_normalized),
    CONSTRAINT uq_app_users_github_id UNIQUE (github_id)
);

CREATE TABLE rooms (
    id              UUID PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    share_id        VARCHAR(32) NOT NULL,
    host_user_id    UUID NOT NULL REFERENCES app_users(id),
    deleted         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rooms_share_id UNIQUE (share_id)
);

CREATE INDEX idx_rooms_host_user_id ON rooms(host_user_id);
CREATE INDEX idx_rooms_last_activity ON rooms(last_activity_at DESC);

CREATE TABLE room_files (
    id              UUID PRIMARY KEY,
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    language        VARCHAR(64),
    content         TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_room_files_room_name UNIQUE (room_id, name)
);

CREATE INDEX idx_room_files_room_id ON room_files(room_id);

CREATE TABLE room_members (
    id              UUID PRIMARY KEY,
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    role            VARCHAR(16) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_room_members_room_user UNIQUE (room_id, user_id),
    CONSTRAINT chk_room_members_role CHECK (role IN ('HOST', 'EDITOR', 'VIEWER'))
);

CREATE INDEX idx_room_members_user_id ON room_members(user_id);

CREATE TABLE collaboration_sessions (
    id              UUID PRIMARY KEY,
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    status          VARCHAR(32) NOT NULL,
    started_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_collaboration_sessions_status CHECK (status IN ('IN_PROGRESS', 'ENDED'))
);

CREATE INDEX idx_collaboration_sessions_room_id ON collaboration_sessions(room_id);
CREATE INDEX idx_collaboration_sessions_room_status ON collaboration_sessions(room_id, status);

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(64) NOT NULL,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked         BOOLEAN NOT NULL DEFAULT FALSE,
    replaced_by_token_hash VARCHAR(64),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_refresh_tokens_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
