export type CollectMapping = {
    sender: string;
    recipient: string;
    subject: string;
    urls: string;
    attachment_hashes: string;
    src_ip: string;
};

export type EnrichFlags = {
    vt_hash: boolean;
    vt_url: boolean;
    abuseipdb_geoip: boolean;
};

export type ConditionState = {
    expression: string;
};

export type ActionInput = {
    [key: string]: string;
};

export type ActionItem = {
    id: string;
    action: string;
    input: ActionInput;
};

export type ActionsState = {
    trueActions: ActionItem[];
    falseActions: ActionItem[];
};

export type PlaybookConfig = {
    name: string;
    collect: CollectMapping;
    enrich: EnrichFlags;
    condition: ConditionState;
    actions: ActionsState;
};

