const { http } = require('../utils/http');

function transformServer(raw) {
    const data = raw.attributes;

    return {
        id: data.identifier,
        internalId: data.internal_id,
        uuid: data.uuid,
        name: data.name,
        node: data.node,
        isNodeUnderMaintenance: data.is_node_under_maintenance,
        status: data.status,
        invocation: data.invocation,
        dockerImage: data.docker_image,
        sftpDetails: {
            ip: data.sftp_details.ip,
            port: data.sftp_details.port,
        },
        description: data.description?.length > 0 ? data.description : null,
        limits: data.limits,
        eggFeatures: data.egg_features || [],
        featureLimits: data.feature_limits,
        isTransferring: data.is_transferring,
        variables: (data.relationships?.variables?.data || []).map(v => ({
            name: v.attributes.name,
            description: v.attributes.description,
            envVariable: v.attributes.env_variable,
            defaultValue: v.attributes.default_value,
            serverValue: v.attributes.server_value,
            isEditable: v.attributes.is_editable,
            rules: v.attributes.rules,
        })),
        allocations: (data.relationships?.allocations?.data || []).map(a => ({
            id: a.attributes.id,
            ip: a.attributes.ip,
            alias: a.attributes.alias,
            port: a.attributes.port,
            notes: a.attributes.notes,
            isDefault: a.attributes.is_default,
        })),
    };
}

module.exports = async function getServer(uuid) {
    const response = await http.get(`/api/client/servers/${uuid}`);
    const server = transformServer(response.data);
    const perms = response.data.meta?.is_server_owner ? ['*'] : (response.data.meta?.user_permissions || []);
    return [server, perms];
};
