import { TokenInfoMap } from '@solana/spl-token-registry';
import {
    ParsedInstruction,
    ParsedTransaction,
    PartiallyDecodedInstruction,
    TransactionInstruction,
} from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import { SerumMarketRegistry } from '@utils/serumMarketRegistry';
import bs58 from 'bs58';

import { LOADER_IDS, PROGRAM_INFO_BY_ID, SPECIAL_IDS, SYSVAR_IDS } from './programs';

export function getProgramName(address: string, cluster: Cluster): string {
    const label = programLabel(address, cluster);
    if (label) return label;
    return `Unknown Program (${address})`;
}

function programLabel(address: string, cluster: Cluster): string | undefined {
    const programInfo = PROGRAM_INFO_BY_ID[address];
    if (programInfo && programInfo.deployments.includes(cluster)) {
        return programInfo.name;
    }

    return LOADER_IDS[address];
}

function tokenLabel(address: string, tokenRegistry?: TokenInfoMap): string | undefined {
    if (!tokenRegistry) return;
    const tokenInfo = tokenRegistry.get(address);
    if (!tokenInfo) return;
    if (tokenInfo.name === tokenInfo.symbol) {
        return tokenInfo.name;
    }
    return `${tokenInfo.symbol} - ${tokenInfo.name}`;
}

export function addressLabel(address: string, cluster: Cluster, tokenRegistry?: TokenInfoMap): string | undefined {
    return (
        programLabel(address, cluster) ||
        SYSVAR_IDS[address] ||
        SPECIAL_IDS[address] ||
        tokenLabel(address, tokenRegistry) ||
        SerumMarketRegistry.get(address, cluster)
    );
}

export function displayAddress(address: string, cluster: Cluster, tokenRegistry: TokenInfoMap): string {
    return addressLabel(address, cluster, tokenRegistry) || address;
}

export function intoTransactionInstruction(
    tx: ParsedTransaction,
    instruction: ParsedInstruction | PartiallyDecodedInstruction
): TransactionInstruction | undefined {
    const message = tx.message;
    if ('parsed' in instruction) return;

    const keys = [];
    for (const account of instruction.accounts) {
        const accountKey = message.accountKeys.find(({ pubkey }) => pubkey.equals(account));
        if (!accountKey) return;
        keys.push({
            isSigner: accountKey.signer,
            isWritable: accountKey.writable,
            pubkey: accountKey.pubkey,
        });
    }

    return new TransactionInstruction({
        data: bs58.decode(instruction.data),
        keys: keys,
        programId: instruction.programId,
    });
}
