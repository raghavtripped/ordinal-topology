import type { Participant, Ballot } from '../types';

export interface ParsedData {
    participants: Participant[];
    ballots: Ballot[];
}

export function parseCsv(text: string): ParsedData {
    // Basic CSV parsing for rows of ranked names
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) throw new Error("Empty CSV");

    const participantsMap = new Map<string, Participant>();
    const ballots: Ballot[] = [];

    // Helper to get or create a participant by name
    const getParticipantId = (name: string) => {
        const cleanName = name.trim();
        if (!cleanName) return null;

        let existingId: string | null = null;
        for (const [id, p] of participantsMap.entries()) {
            if (p.name.toLowerCase() === cleanName.toLowerCase()) {
                existingId = id;
                break;
            }
        }

        if (existingId) return existingId;

        const newId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        participantsMap.set(newId, { id: newId, name: cleanName });
        return newId;
    };

    lines.forEach((line, index) => {
        // Split by comma, preserving quoted strings if necessary (basic split for now)
        const cols = line.split(',');
        const ranking: string[] = [];

        for (const col of cols) {
            const pId = getParticipantId(col);
            if (pId && !ranking.includes(pId)) {
                ranking.push(pId);
            }
        }

        if (ranking.length > 0) {
            // Create a fake voterId for the uploaded ballot
            ballots.push({
                voterId: `v_${Date.now()}_${index}`,
                ranking
            });
        }
    });

    if (participantsMap.size < 2) throw new Error("At least 2 unique participants are required.");
    if (ballots.length === 0) throw new Error("No valid ballots found in the CSV.");

    return {
        participants: Array.from(participantsMap.values()),
        ballots
    };
}

export function parseJson(text: string): ParsedData {
    const data = JSON.parse(text);

    // Check if it's an export from our tool ({ participants, ballots, analytics })
    if (data.participants && Array.isArray(data.participants) && data.ballots && Array.isArray(data.ballots)) {
        return {
            participants: data.participants,
            ballots: data.ballots
        };
    }

    // Alternatively, if it's just an array of rankings (arrays of strings)
    if (Array.isArray(data)) {
        const participantsMap = new Map<string, Participant>();
        const ballots: Ballot[] = [];

        const getParticipantId = (name: string) => {
            const cleanName = name.trim();
            if (!cleanName) return null;

            let existingId: string | null = null;
            for (const [id, p] of participantsMap.entries()) {
                if (p.name.toLowerCase() === cleanName.toLowerCase()) {
                    existingId = id;
                    break;
                }
            }

            if (existingId) return existingId;

            const newId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            participantsMap.set(newId, { id: newId, name: cleanName });
            return newId;
        };

        data.forEach((item, index) => {
            if (Array.isArray(item)) {
                // array of names
                const ranking: string[] = [];
                for (const name of item) {
                    if (typeof name !== 'string') continue;
                    const pId = getParticipantId(name);
                    if (pId && !ranking.includes(pId)) {
                        ranking.push(pId);
                    }
                }
                if (ranking.length > 0) {
                    ballots.push({
                        voterId: `v_${Date.now()}_${index}`,
                        ranking
                    });
                }
            } else if (item && typeof item === 'object' && Array.isArray(item.ranking)) {
                // Or array of ballot objects directly
                ballots.push(item);
            }
        });

        if (participantsMap.size >= 2) {
            return {
                participants: Array.from(participantsMap.values()),
                ballots
            }
        }
    }

    throw new Error("Invalid JSON format. Expected either an AppState export {participants, ballots} or an array of ranked name arrays.");
}
