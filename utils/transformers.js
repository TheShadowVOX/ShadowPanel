// utils/transformers.js

function rawDataToServerObject(data) {
  const attrs = data.attributes;
  return {
    id: attrs.id,
    uuid: attrs.uuid,
    name: attrs.name,
    description: attrs.description,
    status: attrs.status,
    node: attrs.node,
    user: attrs.user,
    allocations: (attrs.relationships?.allocations?.data || []).map(a => ({
      id: a.id,
      // extend as needed
    })),
  };
}

function rawDataToServerAllocation(data) {
  return {
    id: data.attributes.id,
    ip: data.attributes.ip,
    alias: data.attributes.ip_alias,
    port: data.attributes.port,
    notes: data.attributes.notes,
    isDefault: data.attributes.is_default,
  };
}

function rawDataToFileObject(data) {
  return {
    key: `${data.attributes.is_file ? 'file' : 'dir'}_${data.attributes.name}`,
    name: data.attributes.name,
    mode: data.attributes.mode,
    modeBits: data.attributes.mode_bits,
    size: Number(data.attributes.size),
    isFile: data.attributes.is_file,
    isSymlink: data.attributes.is_symlink,
    mimetype: data.attributes.mimetype,
    createdAt: new Date(data.attributes.created_at),
    modifiedAt: new Date(data.attributes.modified_at),
    isArchiveType() {
      return this.isFile && [
        'application/vnd.rar',
        'application/x-rar-compressed',
        'application/x-tar',
        'application/x-br',
        'application/x-bzip2',
        'application/gzip',
        'application/x-gzip',
        'application/x-lzip',
        'application/x-sz',
        'application/x-xz',
        'application/zstd',
        'application/zip',
        'application/x-7z-compressed',
      ].includes(this.mimetype);
    },
    isEditable() {
      if (!this.isFile || this.isArchiveType()) return false;

      const blacklist = [
        'application/jar',
        'application/octet-stream',
        'inode/directory',
        /^image\/(?!svg\+xml)/,
      ];

      return blacklist.every(pattern => {
        if (pattern instanceof RegExp) return !pattern.test(this.mimetype);
        return this.mimetype !== pattern;
      });
    },
  };
}

function rawDataToServerBackup({ attributes }) {
  return {
    uuid: attributes.uuid,
    isSuccessful: attributes.is_successful,
    isLocked: attributes.is_locked,
    name: attributes.name,
    ignoredFiles: attributes.ignored_files,
    checksum: attributes.checksum,
    bytes: attributes.bytes,
    createdAt: new Date(attributes.created_at),
    completedAt: attributes.completed_at ? new Date(attributes.completed_at) : null,
  };
}

function rawDataToServerEggVariable({ attributes }) {
  return {
    name: attributes.name,
    description: attributes.description,
    envVariable: attributes.env_variable,
    defaultValue: attributes.default_value,
    serverValue: attributes.server_value,
    isEditable: attributes.is_editable,
    rules: attributes.rules.split('|'),
  };
}

module.exports = {
  rawDataToServerObject,
  rawDataToServerAllocation,
  rawDataToFileObject,
  rawDataToServerBackup,
  rawDataToServerEggVariable,
};
