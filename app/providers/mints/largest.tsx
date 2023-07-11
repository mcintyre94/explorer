'use client';

import * as Cache from '@providers/cache';
import { ActionType, FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { Cluster } from '@utils/cluster';
import { reportError } from '@utils/sentry';
import React from 'react';
import { Base58EncodedAddress, createDefaultRpcTransport, createSolanaRpc } from 'web3js-experimental';

export type TokenAccountData = {
    uiAmountString: string,
    address: Base58EncodedAddress,
    owner?: Base58EncodedAddress
}

type LargestAccounts = {
    largest: TokenAccountData[];
};

type State = Cache.State<LargestAccounts>;
type Dispatch = Cache.Dispatch<LargestAccounts>;

const StateContext = React.createContext<State | undefined>(undefined);
const DispatchContext = React.createContext<Dispatch | undefined>(undefined);

type ProviderProps = { children: React.ReactNode };
export function LargestAccountsProvider({ children }: ProviderProps) {
    const { url } = useCluster();
    const [state, dispatch] = Cache.useReducer<LargestAccounts>(url);

    // Clear cache whenever cluster is changed
    React.useEffect(() => {
        dispatch({ type: ActionType.Clear, url });
    }, [dispatch, url]);

    return (
        <StateContext.Provider value={state}>
            <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
        </StateContext.Provider>
    );
}

async function fetchLargestAccounts(dispatch: Dispatch, pubkey: Base58EncodedAddress, cluster: Cluster, url: string) {
    dispatch({
        key: pubkey,
        status: Cache.FetchStatus.Fetching,
        type: ActionType.Update,
        url,
    });

    let data;
    let fetchStatus;
    try {
        const transport = createDefaultRpcTransport({ url });
        const rpc = createSolanaRpc({ transport });

        const { value: largestTokenAccounts } = await rpc.getTokenLargestAccounts(pubkey, { commitment: 'confirmed' }).send();
        const withOwners = await Promise.all(
            largestTokenAccounts.map(async (account): Promise<TokenAccountData> => {
                try {
                    const accountInfo = await rpc.getAccountInfo(account.address, {
                        commitment: 'confirmed',
                        encoding: 'jsonParsed'
                    }).send();
                    return {
                        uiAmountString: account.uiAmountString,
                        address: account.address,
                        owner: accountInfo.value?.owner
                    }
                } catch (error) {
                    if (cluster !== Cluster.Custom) {
                        reportError(error, { url });
                    }
                }
                return {
                    uiAmountString: account.uiAmountString,
                    address: account.address,
                }
            })
        )

        data = {
            largest: withOwners
        }

        fetchStatus = FetchStatus.Fetched;
    } catch (error) {
        if (cluster !== Cluster.Custom) {
            reportError(error, { url });
        }
        fetchStatus = FetchStatus.FetchFailed;
    }
    dispatch({
        data,
        key: pubkey,
        status: fetchStatus,
        type: ActionType.Update,
        url,
    });
}

export function useFetchTokenLargestAccounts() {
    const dispatch = React.useContext(DispatchContext);
    if (!dispatch) {
        throw new Error(`useFetchTokenLargestAccounts must be used within a MintsProvider`);
    }

    const { cluster, url } = useCluster();
    return React.useCallback(
        (pubkey: Base58EncodedAddress) => {
            fetchLargestAccounts(dispatch, pubkey, cluster, url);
        },
        [dispatch, cluster, url]
    );
}

export function useTokenLargestTokens(address: string): Cache.CacheEntry<LargestAccounts> | undefined {
    const context = React.useContext(StateContext);

    if (!context) {
        throw new Error(`useTokenLargestTokens must be used within a MintsProvider`);
    }

    return context.entries[address];
}
