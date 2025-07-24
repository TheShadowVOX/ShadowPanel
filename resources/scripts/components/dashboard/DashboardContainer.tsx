import React, { useEffect, useState } from 'react';
import { Server } from '@/api/server/getServer';
import getServers from '@/api/getServers';
import ServerRow from '@/components/dashboard/ServerRow';
import Spinner from '@/components/elements/Spinner';
import PageContentBlock from '@/components/elements/PageContentBlock';
import useFlash from '@/plugins/useFlash';
import { useStoreState } from 'easy-peasy';
import { usePersistedState } from '@/plugins/usePersistedState';
import Switch from '@/components/elements/Switch';
import tw, { styled } from 'twin.macro';
import useSWR from 'swr';
import { PaginatedResult } from '@/api/http';
import Pagination from '@/components/elements/Pagination';
import { useLocation } from 'react-router-dom';
import { FiServer, FiBox } from 'react-icons/fi';

const Header = tw.div`mb-4 flex justify-between items-center`;
const Title = tw.h1`text-3xl font-semibold text-gray-900`;
const ToggleWrapper = tw.div`flex items-center space-x-3`;
const ToggleLabel = tw.span`uppercase text-xs tracking-wide text-gray-500 select-none`;

const EmptyStateContainer = tw.div`flex flex-col items-center justify-center py-16 text-gray-400`;
const EmptyStateIcon = tw(FiBox)`w-16 h-16 mb-4`;
const EmptyStateText = tw.p`text-sm`;

const ServerListContainer = tw.div`space-y-4`;

const PaginationWrapper = tw.div`mt-6 flex justify-center`;

export default function Dashboard() {
    const { search } = useLocation();
    const defaultPage = Number(new URLSearchParams(search).get('page') || '1');

    const [page, setPage] = useState(!isNaN(defaultPage) && defaultPage > 0 ? defaultPage : 1);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const uuid = useStoreState((state) => state.user.data!.uuid);
    const rootAdmin = useStoreState((state) => state.user.data!.rootAdmin);
    const [showOnlyAdmin, setShowOnlyAdmin] = usePersistedState(`${uuid}:show_all_servers`, false);

    const { data: servers, error } = useSWR<PaginatedResult<Server>>(
        ['/api/client/servers', showOnlyAdmin && rootAdmin, page],
        () => getServers({ page, type: showOnlyAdmin && rootAdmin ? 'admin' : undefined })
    );

    useEffect(() => {
        if (!servers) return;
        if (servers.pagination.currentPage > 1 && !servers.items.length) {
            setPage(1);
        }
    }, [servers?.pagination.currentPage]);

    useEffect(() => {
        window.history.replaceState(null, document.title, `/${page <= 1 ? '' : `?page=${page}`}`);
    }, [page]);

    useEffect(() => {
        if (error) clearAndAddHttpError({ key: 'dashboard', error });
        else clearFlashes('dashboard');
    }, [error]);

    return (
        <PageContentBlock title="Dashboard" showFlashKey="dashboard">
            <Header>
                <Title>Dashboard</Title>
                {rootAdmin && (
                    <ToggleWrapper>
                        <ToggleLabel>
                            {showOnlyAdmin ? "Showing others' servers" : 'Showing your servers'}
                        </ToggleLabel>
                        <Switch
                            name="show_all_servers"
                            defaultChecked={showOnlyAdmin}
                            onChange={() => setShowOnlyAdmin((s) => !s)}
                            aria-label="Toggle servers view"
                        />
                    </ToggleWrapper>
                )}
            </Header>

            {!servers ? (
                <div tw="flex justify-center py-24">
                    <Spinner size="large" />
                </div>
            ) : (
                <>
                    {servers.items.length > 0 ? (
                        <ServerListContainer role="list" aria-label="Servers list">
                            {servers.items.map((server) => (
                                <ServerRow
                                    key={server.uuid}
                                    server={server}
                                    css={tw`bg-white rounded-lg shadow-sm p-4 transition-shadow hover:shadow-md`}
                                />
                            ))}
                        </ServerListContainer>
                    ) : (
                        <EmptyStateContainer>
                            <EmptyStateIcon aria-hidden="true" />
                            <EmptyStateText>
                                {showOnlyAdmin
                                    ? 'No other servers available to display.'
                                    : 'You have no servers associated with your account.'}
                            </EmptyStateText>
                        </EmptyStateContainer>
                    )}

                    <PaginationWrapper>
                        <Pagination data={servers} onPageSelect={setPage} />
                    </PaginationWrapper>
                </>
            )}
        </PageContentBlock>
    );
}
