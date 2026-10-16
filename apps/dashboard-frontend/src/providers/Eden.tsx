import { treaty } from '@elysiajs/eden'
import type { App } from 'app'
import { PRIMARY_BACKEND_URL } from '@/lib/backend'
import { createContext, useContext } from 'react';

const client = treaty<App>(PRIMARY_BACKEND_URL, {
    fetch: {
        credentials: 'include'
    }
}) ;

const ElysiaClientContext = createContext(client);

export const ElysiaClientContextProvider = ElysiaClientContext.Provider;
export const useElysiaClient = () => {
    const client = useContext(ElysiaClientContext);
    return client;
}