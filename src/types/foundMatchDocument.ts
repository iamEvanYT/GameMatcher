export interface FoundMatchDocument {
    /*
    e.g:
        [
            [1, 2], // Red Team
            [3, 4]  // Blue Team
        ]
    */
    teams: number[][],
    serverAccessToken: string,
    queueId: string,
    createdAt: Date,
}