import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storeApi, Store } from '../api/client';
import { Plus, Trash2, ExternalLink, RefreshCw, AlertCircle, CheckCircle, Clock, Loader } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const StoreList = () => {
    const queryClient = useQueryClient();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [storeToDelete, setStoreToDelete] = useState<{ id: string; name: string } | null>(null);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['stores'],
        queryFn: storeApi.getStores,
        refetchInterval: 5000,
    });

    const deleteMutation = useMutation({
        mutationFn: storeApi.deleteStore,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            setStoreToDelete(null);
        },
    });

    const handleDelete = (id: string, name: string) => {
        setStoreToDelete({ id, name });
    };

    const confirmDelete = async () => {
        if (storeToDelete) {
            await deleteMutation.mutateAsync(storeToDelete.id);
        }
    };

    const getStatusBadge = (status: Store['status']) => {
        const badges = {
            PROVISIONING: {
                color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                icon: <Loader className="w-4 h-4 animate-spin" />,
            },
            READY: {
                color: 'bg-green-100 text-green-800 border-green-300',
                icon: <CheckCircle className="w-4 h-4" />,
            },
            FAILED: {
                color: 'bg-red-100 text-red-800 border-red-300',
                icon: <AlertCircle className="w-4 h-4" />,
            },
            DELETING: {
                color: 'bg-gray-100 text-gray-800 border-gray-300',
                icon: <Clock className="w-4 h-4" />,
            },
        };

        const badge = badges[status];
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${badge.color}`}>
                {badge.icon}
                {status}
            </span>
        );
    };

    const getEngineIcon = (engine: Store['engine']) => {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {engine}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="w-5 h-5" />
                    <span>Failed to load stores: {(error as Error).message}</span>
                </div>
            </div>
        );
    }

    const stores = data?.stores || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Stores</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage your ecommerce stores
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Create Store
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-500">Total Stores</div>
                    <div className="mt-1 text-3xl font-bold text-gray-900">{stores.length}</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-500">Ready</div>
                    <div className="mt-1 text-3xl font-bold text-green-600">
                        {stores.filter(s => s.status === 'READY').length}
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-500">Provisioning</div>
                    <div className="mt-1 text-3xl font-bold text-yellow-600">
                        {stores.filter(s => s.status === 'PROVISIONING').length}
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-500">Failed</div>
                    <div className="mt-1 text-3xl font-bold text-red-600">
                        {stores.filter(s => s.status === 'FAILED').length}
                    </div>
                </div>
            </div>

            {/* Store List */}
            {stores.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                    <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No stores yet</h3>
                    <p className="text-gray-500 mb-4">Get started by creating your first store</p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Store
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stores.map((store) => (
                        <div
                            key={store.id}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{store.name}</h3>
                                    <div className="flex items-center gap-2">
                                        {getEngineIcon(store.engine)}
                                    </div>
                                </div>
                                {getStatusBadge(store.status)}
                            </div>

                            {store.url && (
                                <div className="mb-3">
                                    <a
                                        href={store.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Visit Store
                                    </a>
                                </div>
                            )}

                            {store.customDomain && (
                                <div className="mb-3">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
                                        Custom Domain
                                    </span>
                                    <a
                                        href={`http://${store.customDomain}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-sm text-gray-900 hover:text-primary-600 font-medium"
                                    >
                                        {store.customDomain}
                                    </a>
                                </div>
                            )}

                            {store.adminUrl && (
                                <div className="mb-3">
                                    <a
                                        href={store.adminUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-700"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Admin Panel
                                    </a>
                                </div>
                            )}

                            {store.failureReason && (
                                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                                    <strong>Error:</strong> {store.failureReason}
                                </div>
                            )}

                            <div className="text-xs text-gray-500 mb-4">
                                Created {formatDistanceToNow(new Date(store.createdAt), { addSuffix: true })}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDelete(store.id, store.name)}
                                    disabled={deleteMutation.isPending || store.status === 'DELETING'}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Store Modal */}
            {showCreateForm && (
                <CreateStoreModal onClose={() => setShowCreateForm(false)} />
            )}

            {/* Delete Confirmation Modal */}
            {storeToDelete && (
                <DeleteConfirmationModal
                    storeName={storeToDelete.name}
                    isDeleting={deleteMutation.isPending}
                    onConfirm={confirmDelete}
                    onCancel={() => setStoreToDelete(null)}
                />
            )}
        </div>
    );
};

const DeleteConfirmationModal = ({
    storeName,
    isDeleting,
    onConfirm,
    onCancel
}: {
    storeName: string;
    isDeleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
                <div className="flex items-center gap-3 text-red-600 mb-4">
                    <AlertCircle className="w-8 h-8" />
                    <h2 className="text-xl font-bold text-gray-900">Delete Store?</h2>
                </div>

                <p className="text-gray-600 mb-6">
                    Are you sure you want to delete <strong>{storeName}</strong>? This action cannot be undone.
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                    >
                        {isDeleting ? (
                            <>
                                <Loader className="w-4 h-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                Delete Store
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CreateStoreModal = ({ onClose }: { onClose: () => void }) => {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [engine, setEngine] = useState<'WOOCOMMERCE' | 'MEDUSA'>('WOOCOMMERCE');
    const [customDomain, setCustomDomain] = useState('');

    const createMutation = useMutation({
        mutationFn: storeApi.createStore,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            onClose();
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await createMutation.mutateAsync({ name, engine, customDomain: customDomain || undefined });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Store</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Store Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            placeholder="my-store"
                            required
                            pattern="[a-z0-9-]+"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Lowercase letters, numbers, and hyphens only
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Engine
                        </label>
                        <select
                            value={engine}
                            onChange={(e) => setEngine(e.target.value as 'WOOCOMMERCE' | 'MEDUSA')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="WOOCOMMERCE">WooCommerce</option>
                            <option value="MEDUSA">Medusa</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Custom Domain (Optional)
                        </label>
                        <input
                            type="text"
                            value={customDomain}
                            onChange={(e) => setCustomDomain(e.target.value)}
                            placeholder="store.example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Point your domain CNAME to lb.store-platform.com
                        </p>
                    </div>

                    {createMutation.isError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                            {(createMutation.error as Error).message}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending || !name}
                            className="flex-1 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {createMutation.isPending ? 'Creating...' : 'Create Store'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StoreList;
