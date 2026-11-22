import { pgClient } from "../../db.config.ts";

/**
 * Upserts a file status row for a given user.
 * 
 * statusRaw can be 'pendding', 'done-error' ,'done-success', 'done-error-read', 'done-success-read'
 * 
 * returns pgClient query data (usually not needed to check)
 */
export async function updateMdFileStatus(userId, folder, filePath, statusRaw) {

// Remove trailing slash from folder and collapse double slashes in filePath
    folder = folder.replace(/\/+$/, '');
    const cleanFilePath = filePath.replace(/\/{2,}/g, '/');


    let status;
    if(statusRaw == 'pending') {
        status = 0;
    } else if(statusRaw == 'done-error') {
        status = 1;
    } else if(statusRaw == 'done-success') {
        status = 2;
    } else if(statusRaw == 'done-error-read') {
        status = 3;
    } else if(statusRaw == 'done-success-read') {
        status = 4;
    } else {
        status = -1;
    }

    const query = `
        INSERT INTO md_file_statuses (user_id, folder, file_path, status, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, file_path)
        DO UPDATE SET status = EXCLUDED.status, folder = EXCLUDED.folder, updated_at = CURRENT_TIMESTAMP
    `;

    return pgClient.query(query, [userId, folder, cleanFilePath, status]);
}

export async function getMdFileStatusByPath(userId, filePath) {
    const query = `
        SELECT status
        FROM md_file_statuses
        WHERE user_id = $1 AND file_path = $2
        LIMIT 1
    `;

    const result = await pgClient.query(query, [userId, filePath]);

    if (!result.rows || result.rows.length === 0) {
        return -1;
    }

    return result.rows[0].status;
}