-- =====================================================
-- PRODUCTION OPTIMIZATIONS MIGRATION
-- =====================================================
-- This migration adds indexes and functions for production scale
-- Safe to run on existing database - only adds new items
-- =====================================================

-- =====================================================
-- NEW INDEXES
-- =====================================================

-- Critical for getAllPrograms() last_checked_at lookup - prevents N+1 full table scans
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_program_created
ON monitoring_logs(program_id, created_at DESC);

-- Composite indexes for efficient notification queries with ordering
CREATE INDEX IF NOT EXISTS idx_idl_changes_slack_unnotified
ON idl_changes(slack_notified, detected_at DESC)
WHERE slack_notified = false;

CREATE INDEX IF NOT EXISTS idx_idl_changes_telegram_user_unnotified
ON idl_changes(telegram_user_notified, detected_at DESC)
WHERE telegram_user_notified = false;

-- =====================================================
-- NEW FUNCTIONS
-- =====================================================

-- Function to get all programs with their last check timestamp
-- Optimized to avoid N+1 queries by using lateral join
-- Supports pagination with limit and offset
CREATE OR REPLACE FUNCTION get_all_programs_with_last_check(
    p_limit INT DEFAULT NULL,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    program_id TEXT,
    name TEXT,
    description TEXT,
    owner_id UUID,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    last_checked_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        mp.id,
        mp.program_id,
        mp.name,
        mp.description,
        mp.owner_id,
        mp.is_active,
        mp.created_at,
        mp.updated_at,
        ml.log_created_at as last_checked_at
    FROM monitored_programs mp
    LEFT JOIN LATERAL (
        SELECT monitoring_logs.created_at as log_created_at
        FROM monitoring_logs
        WHERE monitoring_logs.program_id = mp.id
        ORDER BY monitoring_logs.created_at DESC
        LIMIT 1
    ) ml ON true
    ORDER BY mp.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get change statistics with aggregation
-- Optimized to avoid fetching all rows and counting in memory
CREATE OR REPLACE FUNCTION get_change_statistics()
RETURNS TABLE (
    total_count BIGINT,
    severity_counts JSONB,
    type_counts JSONB,
    recent_24h_count BIGINT
) AS $$
DECLARE
    v_yesterday TIMESTAMPTZ;
BEGIN
    v_yesterday := NOW() - INTERVAL '24 hours';

    RETURN QUERY
    WITH severity_agg AS (
        SELECT
            jsonb_object_agg(
                severity,
                count
            ) as counts
        FROM (
            SELECT
                severity,
                COUNT(*)::int as count
            FROM idl_changes
            GROUP BY severity
        ) s
    ),
    type_agg AS (
        SELECT
            jsonb_object_agg(
                change_type,
                count
            ) as counts
        FROM (
            SELECT
                change_type,
                COUNT(*)::int as count
            FROM idl_changes
            GROUP BY change_type
        ) t
    ),
    totals AS (
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE detected_at >= v_yesterday) as recent
        FROM idl_changes
    )
    SELECT
        totals.total,
        COALESCE(severity_agg.counts, '{}'::jsonb),
        COALESCE(type_agg.counts, '{}'::jsonb),
        totals.recent
    FROM totals
    LEFT JOIN severity_agg ON true
    LEFT JOIN type_agg ON true;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Verify indexes created:
--   SELECT indexname FROM pg_indexes WHERE tablename IN ('monitoring_logs', 'idl_changes');
--
-- Verify functions created:
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
-- =====================================================
