(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime-types.d.ts" />
/// <reference path="../../runtime/base/dev-globals.d.ts" />
/// <reference path="../../runtime/base/dev-protocol.d.ts" />
/// <reference path="../../runtime/base/dev-extensions.ts" />
__turbopack_context__.s([
    "connect",
    ()=>connect,
    "setHooks",
    ()=>setHooks,
    "subscribeToUpdate",
    ()=>subscribeToUpdate
]);
function connect({ addMessageListener, sendMessage, onUpdateError = console.error }) {
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: ([chunkPath, callback])=>{
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        const deletedModules = new Set(updateA.modules ?? []);
        const addedModules = new Set(updateB.modules ?? []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        const added = new Set([
            ...updateA.added ?? [],
            ...updateB.added ?? []
        ]);
        const deleted = new Set([
            ...updateA.deleted ?? [],
            ...updateB.deleted ?? []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        const modules = new Set([
            ...updateA.modules ?? [],
            ...updateB.added ?? []
        ]);
        for (const moduleId of updateB.deleted ?? []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set(updateB.modules ?? []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error(`Invariant: ${message}`);
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/src/components/navbar/styles.module.css [client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "buttonJoin": "styles-module__jTJ9Xq__buttonJoin",
  "container": "styles-module__jTJ9Xq__container",
  "navbar": "styles-module__jTJ9Xq__navbar",
  "navbarOptionContainer": "styles-module__jTJ9Xq__navbarOptionContainer",
});
}),
"[project]/src/config/index.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BASE_URL",
    ()=>BASE_URL,
    "clientServer",
    ()=>clientServer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/axios/lib/axios.js [client] (ecmascript)");
;
const BASE_URL = "https://linkedinclone-5gvz.onrender.com";
const clientServer = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].create({
    baseURL: BASE_URL
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/config/redux/action/authAction/index.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "acceptConnection",
    ()=>acceptConnection,
    "getAboutUser",
    ()=>getAboutUser,
    "getAllUsers",
    ()=>getAllUsers,
    "getConnectionsRequest",
    ()=>getConnectionsRequest,
    "getMyConnectionRequest",
    ()=>getMyConnectionRequest,
    "loginUser",
    ()=>loginUser,
    "registerUser",
    ()=>registerUser,
    "sendConnectionRequest",
    ()=>sendConnectionRequest
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/config/index.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@reduxjs/toolkit/dist/redux-toolkit.modern.mjs [client] (ecmascript) <locals>");
;
;
const loginUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("user/login", async (user, thunkAPI)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].post("/login", {
            email: user.email,
            password: user.password
        });
        if (response.data.token) {
            localStorage.setItem("token", response.data.token);
        } else {
            return thunkAPI.rejectWithValue({
                message: "Token not found"
            });
        }
        return thunkAPI.fulfillWithValue(response.data);
    } catch (error) {
        return thunkAPI.rejectWithValue(error.response.data);
    }
});
const registerUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("user/register", async (user, thunkAPI)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].post("/register", {
            username: user.username,
            email: user.email,
            password: user.password,
            name: user.name
        });
        return thunkAPI.fulfillWithValue(response.data);
    } catch (error) {
        return thunkAPI.rejectWithValue(error.response.data);
    }
});
const getAboutUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("user/getAboutUser", async (user, thunkAPI)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].get("/get_user_and_profile", {
            params: {
                token: user.token
            }
        });
        return thunkAPI.fulfillWithValue(response.data);
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response.data);
    }
});
const getAllUsers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("user/getAllUsers", async (_, thunkAPI)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].get("/user/get_all_users");
        return thunkAPI.fulfillWithValue(response.data);
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response.data);
    }
});
const sendConnectionRequest = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("user/sentConnectionRequest", async (user, thunkAPI)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].post("/user/sent_connection_request", {
            token: user.token,
            connectionId: user.connectionId
        });
        await thunkAPI.dispatch(getConnectionsRequest({
            token: user.token
        }));
        return thunkAPI.fulfillWithValue(response.data);
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response.data.message);
    }
});
const getConnectionsRequest = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("user/getConnectionRequests", async (user, thunkAPI)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].get("/user/getConnectionRequests", {
            params: {
                token: user.token
            }
        });
        return thunkAPI.fulfillWithValue(response.data);
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response.data.message);
    }
});
const getMyConnectionRequest = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("user/getMyConnectionRequest", async (user, thunkAPI)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].get("/user/user_connection_request", {
            params: {
                token: user.token
            }
        });
        return thunkAPI.fulfillWithValue(response.data);
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response.data.message);
    }
});
const acceptConnection = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAsyncThunk"])("user/acceptConnection", async (user, thunkAPI)=>{
    try {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["clientServer"].post("/user/accept_connection_request", {
            token: user.token,
            requestId: user.connectionId,
            action_type: user.action
        });
        thunkAPI.dispatch(getConnectionsRequest({
            token: user.token
        }));
        thunkAPI.dispatch(getMyConnectionRequest({
            token: user.token
        }));
        return thunkAPI.fulfillWithValue(response.data);
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response.data.message);
    }
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/config/redux/reducer/authReducer/index.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "emptyMessage",
    ()=>emptyMessage,
    "reset",
    ()=>reset,
    "setTokenIsNotThere",
    ()=>setTokenIsNotThere,
    "setTokenIsThere",
    ()=>setTokenIsThere
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@reduxjs/toolkit/dist/redux-toolkit.modern.mjs [client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/config/redux/action/authAction/index.js [client] (ecmascript)");
;
;
const initialState = {
    user: [],
    isSuccess: false,
    isError: false,
    isLoading: false,
    loggedIn: false,
    message: "",
    isTokenThere: false,
    profileFetched: false,
    connections: [],
    connectionRequest: [],
    all_users: [],
    all_profiles_fetched: false
};
const authSlice = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reduxjs$2f$toolkit$2f$dist$2f$redux$2d$toolkit$2e$modern$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createSlice"])({
    name: "auth",
    initialState,
    reducers: {
        reset: ()=>initialState,
        handleLoginUser: (state)=>{
            state.message = "Hello";
        },
        emptyMessage: (state)=>{
            state.message = "";
        },
        setTokenIsThere: (state)=>{
            state.isTokenThere = true;
        },
        setTokenIsNotThere: (state)=>{
            state.isTokenThere = false;
        }
    },
    extraReducers: (builder)=>{
        builder.addCase(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["loginUser"].pending, (state)=>{
            state.isLoading = true;
            state.message = {
                message: "Knocking the door.."
            };
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["loginUser"].fulfilled, (state, action)=>{
            state.isLoading = false;
            state.isError = false;
            state.isSuccess = true;
            state.loggedIn = true;
            state.message = {
                message: "Log in successfully"
            };
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["loginUser"].rejected, (state, action)=>{
            state.isLoading = false;
            state.isError = true;
            state.message = action.payload;
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["registerUser"].pending, (state)=>{
            state.isLoading = true;
            state.message = {
                message: "Registering you"
            };
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["registerUser"].fulfilled, (state, action)=>{
            state.isLoading = false;
            state.isError = false;
            state.isSuccess = true;
            // state.loggedIn = true;
            state.message = {
                message: "Registration is successful, please login"
            };
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["registerUser"].rejected, (state, action)=>{
            state.isLoading = false;
            state.isError = true;
            state.message = action.payload;
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAboutUser"].fulfilled, (state, action)=>{
            state.isLoading = false;
            state.isError = false;
            state.profileFetched = true;
            state.user = action.payload;
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAllUsers"].fulfilled, (state, action)=>{
            state.isLoading = false;
            state.isError = false;
            state.all_profiles_fetched = true;
            state.all_users = action.payload.profiles;
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getConnectionsRequest"].fulfilled, (state, action)=>{
            state.connectionRequest = action.payload.connectionRequest || [];
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getConnectionsRequest"].rejected, (state, action)=>{
            state.message = action.payload;
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getMyConnectionRequest"].fulfilled, (state, action)=>{
            state.connectionRequest = action.payload.connections || [];
        }).addCase(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getMyConnectionRequest"].rejected, (state, action)=>{
            state.message = action.payload;
        });
    }
});
const { reset, emptyMessage, setTokenIsThere, setTokenIsNotThere } = authSlice.actions;
const __TURBOPACK__default__export__ = authSlice.reducer;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/navbar/index.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>NavbarComponents
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/compiler-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$navbar$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/src/components/navbar/styles.module.css [client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/router.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-redux/dist/react-redux.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$reducer$2f$authReducer$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/config/redux/reducer/authReducer/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
function NavbarComponents() {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["c"])(17);
    if ($[0] !== "f443f285c199a361b9fecf8ca000b1baefc11ee4c043a376980e710aadc44fdb") {
        for(let $i = 0; $i < 17; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "f443f285c199a361b9fecf8ca000b1baefc11ee4c043a376980e710aadc44fdb";
    }
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const dispatch = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useDispatch"])();
    const authState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"])(_NavbarComponentsUseSelector);
    let t0;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = {
            cursor: "pointer"
        };
        $[1] = t0;
    } else {
        t0 = $[1];
    }
    let t1;
    if ($[2] !== router) {
        t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
            style: t0,
            onClick: {
                "NavbarComponents[<h1>.onClick]": ()=>{
                    router.push("/");
                }
            }["NavbarComponents[<h1>.onClick]"],
            children: "Pro connect"
        }, void 0, false, {
            fileName: "[project]/src/components/navbar/index.jsx",
            lineNumber: 29,
            columnNumber: 10
        }, this);
        $[2] = router;
        $[3] = t1;
    } else {
        t1 = $[3];
    }
    let t2;
    if ($[4] !== authState.profileFetched || $[5] !== dispatch || $[6] !== router) {
        t2 = authState.profileFetched && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: "flex",
                    gap: "1.2rem"
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        onClick: {
                            "NavbarComponents[<p>.onClick]": ()=>{
                                router.push("/profile");
                            }
                        }["NavbarComponents[<p>.onClick]"],
                        style: {
                            fontWeight: "bold",
                            cursor: "pointer"
                        },
                        children: "Profile"
                    }, void 0, false, {
                        fileName: "[project]/src/components/navbar/index.jsx",
                        lineNumber: 44,
                        columnNumber: 10
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        onClick: {
                            "NavbarComponents[<p>.onClick]": ()=>{
                                localStorage.removeItem("token");
                                router.push("/login");
                                dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$reducer$2f$authReducer$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["reset"])());
                            }
                        }["NavbarComponents[<p>.onClick]"],
                        style: {
                            fontWeight: "bold",
                            cursor: "pointer"
                        },
                        children: "Logout"
                    }, void 0, false, {
                        fileName: "[project]/src/components/navbar/index.jsx",
                        lineNumber: 51,
                        columnNumber: 23
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/navbar/index.jsx",
                lineNumber: 41,
                columnNumber: 43
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/navbar/index.jsx",
            lineNumber: 41,
            columnNumber: 38
        }, this);
        $[4] = authState.profileFetched;
        $[5] = dispatch;
        $[6] = router;
        $[7] = t2;
    } else {
        t2 = $[7];
    }
    let t3;
    if ($[8] !== authState.profileFetched || $[9] !== router) {
        t3 = !authState.profileFetched && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            onClick: {
                "NavbarComponents[<div>.onClick]": ()=>{
                    router.push("/login");
                }
            }["NavbarComponents[<div>.onClick]"],
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$navbar$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].buttonJoin,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: "Be a part"
            }, void 0, false, {
                fileName: "[project]/src/components/navbar/index.jsx",
                lineNumber: 74,
                columnNumber: 73
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/navbar/index.jsx",
            lineNumber: 70,
            columnNumber: 39
        }, this);
        $[8] = authState.profileFetched;
        $[9] = router;
        $[10] = t3;
    } else {
        t3 = $[10];
    }
    let t4;
    if ($[11] !== t2 || $[12] !== t3) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$navbar$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].navbarOptionContainer,
            children: [
                t2,
                t3
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/navbar/index.jsx",
            lineNumber: 83,
            columnNumber: 10
        }, this);
        $[11] = t2;
        $[12] = t3;
        $[13] = t4;
    } else {
        t4 = $[13];
    }
    let t5;
    if ($[14] !== t1 || $[15] !== t4) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$navbar$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].container,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$navbar$2f$styles$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].navbar,
                children: [
                    t1,
                    t4
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/navbar/index.jsx",
                lineNumber: 92,
                columnNumber: 44
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/navbar/index.jsx",
            lineNumber: 92,
            columnNumber: 10
        }, this);
        $[14] = t1;
        $[15] = t4;
        $[16] = t5;
    } else {
        t5 = $[16];
    }
    return t5;
}
_s(NavbarComponents, "e+EMObc2/ECw8bJAroUlGNl0KnQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useDispatch"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"]
    ];
});
_c = NavbarComponents;
function _NavbarComponentsUseSelector(state) {
    return state.auth;
}
var _c;
__turbopack_context__.k.register(_c, "NavbarComponents");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/layout/userLayout/index.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>UserLayout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/compiler-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$navbar$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/navbar/index.jsx [client] (ecmascript)");
;
;
;
;
function UserLayout(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["c"])(4);
    if ($[0] !== "7ebc5b48e4a33f1ce954597a846ced02439221fed9b3f456270bb80b69e479ec") {
        for(let $i = 0; $i < 4; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "7ebc5b48e4a33f1ce954597a846ced02439221fed9b3f456270bb80b69e479ec";
    }
    const { children } = t0;
    let t1;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$navbar$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
            fileName: "[project]/src/layout/userLayout/index.jsx",
            lineNumber: 17,
            columnNumber: 10
        }, this);
        $[1] = t1;
    } else {
        t1 = $[1];
    }
    let t2;
    if ($[2] !== children) {
        t2 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t1,
                children
            ]
        }, void 0, true, {
            fileName: "[project]/src/layout/userLayout/index.jsx",
            lineNumber: 24,
            columnNumber: 10
        }, this);
        $[2] = children;
        $[3] = t2;
    } else {
        t2 = $[3];
    }
    return t2;
}
_c = UserLayout;
var _c;
__turbopack_context__.k.register(_c, "UserLayout");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/layout/dashboardLayout/index.module.css [client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "homeContainer": "index-module__FY7iTa__homeContainer",
  "homeContainer_extraContainer": "index-module__FY7iTa__homeContainer_extraContainer",
  "homeContainer_feedContainer": "index-module__FY7iTa__homeContainer_feedContainer",
  "homeContainer_left": "index-module__FY7iTa__homeContainer_left",
  "mobileNavBar": "index-module__FY7iTa__mobileNavBar",
  "sideBarOption": "index-module__FY7iTa__sideBarOption",
});
}),
"[project]/src/layout/dashboardLayout/index.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DashboardLayout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/compiler-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$layout$2f$dashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/src/layout/dashboardLayout/index.module.css [client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$reducer$2f$authReducer$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/config/redux/reducer/authReducer/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-redux/dist/react-redux.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/config/redux/action/authAction/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
function DashboardLayout(t0) {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["c"])(61);
    if ($[0] !== "6dc91ebcd9783801c2e441667e643d0f9db47769c5d4890414c35bd2bfebf66a") {
        for(let $i = 0; $i < 61; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "6dc91ebcd9783801c2e441667e643d0f9db47769c5d4890414c35bd2bfebf66a";
    }
    const { children } = t0;
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const authState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"])(_DashboardLayoutUseSelector);
    const dispatch = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useDispatch"])();
    let t1;
    if ($[1] !== dispatch || $[2] !== router) {
        t1 = ({
            "DashboardLayout[useEffect()]": ()=>{
                if (localStorage.getItem("token") === null) {
                    router.push("/login");
                }
                dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$reducer$2f$authReducer$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["setTokenIsThere"])());
            }
        })["DashboardLayout[useEffect()]"];
        $[1] = dispatch;
        $[2] = router;
        $[3] = t1;
    } else {
        t1 = $[3];
    }
    let t2;
    if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = [];
        $[4] = t2;
    } else {
        t2 = $[4];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])(t1, t2);
    let t3;
    if ($[5] !== router) {
        t3 = ({
            "DashboardLayout[<div>.onClick]": ()=>{
                router.push("/dashboard");
            }
        })["DashboardLayout[<div>.onClick]"];
        $[5] = router;
        $[6] = t3;
    } else {
        t3 = $[6];
    }
    let t4;
    let t5;
    if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            strokeWidth: 1.5,
            stroke: "currentColor",
            className: "size-6",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                d: "m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
            }, void 0, false, {
                fileName: "[project]/src/layout/dashboardLayout/index.jsx",
                lineNumber: 61,
                columnNumber: 141
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 61,
            columnNumber: 10
        }, this);
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            children: "Home"
        }, void 0, false, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 62,
            columnNumber: 10
        }, this);
        $[7] = t4;
        $[8] = t5;
    } else {
        t4 = $[7];
        t5 = $[8];
    }
    let t6;
    if ($[9] !== t3) {
        t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            onClick: t3,
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$layout$2f$dashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].sideBarOption,
            children: [
                t4,
                t5
            ]
        }, void 0, true, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 71,
            columnNumber: 10
        }, this);
        $[9] = t3;
        $[10] = t6;
    } else {
        t6 = $[10];
    }
    let t7;
    if ($[11] !== router) {
        t7 = ({
            "DashboardLayout[<div>.onClick]": ()=>{
                router.push("/discover");
            }
        })["DashboardLayout[<div>.onClick]"];
        $[11] = router;
        $[12] = t7;
    } else {
        t7 = $[12];
    }
    let t8;
    let t9;
    if ($[13] === Symbol.for("react.memo_cache_sentinel")) {
        t8 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            strokeWidth: 1.5,
            stroke: "currentColor",
            className: "size-6",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                d: "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            }, void 0, false, {
                fileName: "[project]/src/layout/dashboardLayout/index.jsx",
                lineNumber: 92,
                columnNumber: 141
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 92,
            columnNumber: 10
        }, this);
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            children: "Search"
        }, void 0, false, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 93,
            columnNumber: 10
        }, this);
        $[13] = t8;
        $[14] = t9;
    } else {
        t8 = $[13];
        t9 = $[14];
    }
    let t10;
    if ($[15] !== t7) {
        t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            onClick: t7,
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$layout$2f$dashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].sideBarOption,
            children: [
                t8,
                t9
            ]
        }, void 0, true, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 102,
            columnNumber: 11
        }, this);
        $[15] = t7;
        $[16] = t10;
    } else {
        t10 = $[16];
    }
    let t11;
    if ($[17] !== router) {
        t11 = ({
            "DashboardLayout[<div>.onClick]": ()=>{
                router.push("/my_connections");
            }
        })["DashboardLayout[<div>.onClick]"];
        $[17] = router;
        $[18] = t11;
    } else {
        t11 = $[18];
    }
    let t12;
    let t13;
    if ($[19] === Symbol.for("react.memo_cache_sentinel")) {
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            strokeWidth: 1.5,
            stroke: "currentColor",
            className: "size-6",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                d: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            }, void 0, false, {
                fileName: "[project]/src/layout/dashboardLayout/index.jsx",
                lineNumber: 123,
                columnNumber: 142
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 123,
            columnNumber: 11
        }, this);
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            children: "My connection"
        }, void 0, false, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 124,
            columnNumber: 11
        }, this);
        $[19] = t12;
        $[20] = t13;
    } else {
        t12 = $[19];
        t13 = $[20];
    }
    let t14;
    if ($[21] !== t11) {
        t14 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            onClick: t11,
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$layout$2f$dashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].sideBarOption,
            children: [
                t12,
                t13
            ]
        }, void 0, true, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 133,
            columnNumber: 11
        }, this);
        $[21] = t11;
        $[22] = t14;
    } else {
        t14 = $[22];
    }
    let t15;
    if ($[23] !== t10 || $[24] !== t14 || $[25] !== t6) {
        t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$layout$2f$dashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].homeContainer_left,
            children: [
                t6,
                t10,
                t14
            ]
        }, void 0, true, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 141,
            columnNumber: 11
        }, this);
        $[23] = t10;
        $[24] = t14;
        $[25] = t6;
        $[26] = t15;
    } else {
        t15 = $[26];
    }
    let t16;
    if ($[27] !== children) {
        t16 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$layout$2f$dashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].homeContainer_feedContainer,
            children: children
        }, void 0, false, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 151,
            columnNumber: 11
        }, this);
        $[27] = children;
        $[28] = t16;
    } else {
        t16 = $[28];
    }
    let t17;
    if ($[29] === Symbol.for("react.memo_cache_sentinel")) {
        t17 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
            children: "Top Profiles"
        }, void 0, false, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 159,
            columnNumber: 11
        }, this);
        $[29] = t17;
    } else {
        t17 = $[29];
    }
    let t18;
    if ($[30] !== authState.all_profiles_fetched || $[31] !== authState.all_users) {
        t18 = authState.all_profiles_fetched && authState.all_users?.filter(_DashboardLayoutAnonymous).map(_DashboardLayoutAnonymous2);
        $[30] = authState.all_profiles_fetched;
        $[31] = authState.all_users;
        $[32] = t18;
    } else {
        t18 = $[32];
    }
    let t19;
    if ($[33] !== t18) {
        t19 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$layout$2f$dashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].homeContainer_extraContainer,
            children: [
                t17,
                t18
            ]
        }, void 0, true, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 175,
            columnNumber: 11
        }, this);
        $[33] = t18;
        $[34] = t19;
    } else {
        t19 = $[34];
    }
    let t20;
    if ($[35] !== t15 || $[36] !== t16 || $[37] !== t19) {
        t20 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$layout$2f$dashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].homeContainer,
                children: [
                    t15,
                    t16,
                    t19
                ]
            }, void 0, true, {
                fileName: "[project]/src/layout/dashboardLayout/index.jsx",
                lineNumber: 183,
                columnNumber: 38
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 183,
            columnNumber: 11
        }, this);
        $[35] = t15;
        $[36] = t16;
        $[37] = t19;
        $[38] = t20;
    } else {
        t20 = $[38];
    }
    let t21;
    if ($[39] !== router) {
        t21 = ({
            "DashboardLayout[<div>.onClick]": ()=>{
                router.push("/dashboard");
            }
        })["DashboardLayout[<div>.onClick]"];
        $[39] = router;
        $[40] = t21;
    } else {
        t21 = $[40];
    }
    let t22;
    if ($[41] === Symbol.for("react.memo_cache_sentinel")) {
        t22 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            strokeWidth: 1.5,
            stroke: "currentColor",
            className: "size-6",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                d: "m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
            }, void 0, false, {
                fileName: "[project]/src/layout/dashboardLayout/index.jsx",
                lineNumber: 205,
                columnNumber: 142
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 205,
            columnNumber: 11
        }, this);
        $[41] = t22;
    } else {
        t22 = $[41];
    }
    let t23;
    if ($[42] !== t21) {
        t23 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            onClick: t21,
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$layout$2f$dashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].singleNavItemHolder_mobileView,
            children: t22
        }, void 0, false, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 212,
            columnNumber: 11
        }, this);
        $[42] = t21;
        $[43] = t23;
    } else {
        t23 = $[43];
    }
    let t24;
    if ($[44] !== router) {
        t24 = ({
            "DashboardLayout[<div>.onClick]": ()=>{
                router.push("/discover");
            }
        })["DashboardLayout[<div>.onClick]"];
        $[44] = router;
        $[45] = t24;
    } else {
        t24 = $[45];
    }
    let t25;
    if ($[46] === Symbol.for("react.memo_cache_sentinel")) {
        t25 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            strokeWidth: 1.5,
            stroke: "currentColor",
            className: "size-6",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                d: "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            }, void 0, false, {
                fileName: "[project]/src/layout/dashboardLayout/index.jsx",
                lineNumber: 232,
                columnNumber: 142
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 232,
            columnNumber: 11
        }, this);
        $[46] = t25;
    } else {
        t25 = $[46];
    }
    let t26;
    if ($[47] !== t24) {
        t26 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            onClick: t24,
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$layout$2f$dashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].singleNavItemHolder_mobileView,
            children: t25
        }, void 0, false, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 239,
            columnNumber: 11
        }, this);
        $[47] = t24;
        $[48] = t26;
    } else {
        t26 = $[48];
    }
    let t27;
    if ($[49] !== router) {
        t27 = ({
            "DashboardLayout[<div>.onClick]": ()=>{
                router.push("/my_connections");
            }
        })["DashboardLayout[<div>.onClick]"];
        $[49] = router;
        $[50] = t27;
    } else {
        t27 = $[50];
    }
    let t28;
    if ($[51] === Symbol.for("react.memo_cache_sentinel")) {
        t28 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            strokeWidth: 1.5,
            stroke: "currentColor",
            className: "size-6",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                d: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            }, void 0, false, {
                fileName: "[project]/src/layout/dashboardLayout/index.jsx",
                lineNumber: 259,
                columnNumber: 142
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 259,
            columnNumber: 11
        }, this);
        $[51] = t28;
    } else {
        t28 = $[51];
    }
    let t29;
    if ($[52] !== t27) {
        t29 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            onClick: t27,
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$layout$2f$dashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].singleNavItemHolder_mobileView,
            children: t28
        }, void 0, false, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 266,
            columnNumber: 11
        }, this);
        $[52] = t27;
        $[53] = t29;
    } else {
        t29 = $[53];
    }
    let t30;
    if ($[54] !== t23 || $[55] !== t26 || $[56] !== t29) {
        t30 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$layout$2f$dashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].mobileNavBar,
            children: [
                t23,
                t26,
                t29
            ]
        }, void 0, true, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 274,
            columnNumber: 11
        }, this);
        $[54] = t23;
        $[55] = t26;
        $[56] = t29;
        $[57] = t30;
    } else {
        t30 = $[57];
    }
    let t31;
    if ($[58] !== t20 || $[59] !== t30) {
        t31 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t20,
                t30
            ]
        }, void 0, true, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 284,
            columnNumber: 11
        }, this);
        $[58] = t20;
        $[59] = t30;
        $[60] = t31;
    } else {
        t31 = $[60];
    }
    return t31;
}
_s(DashboardLayout, "pZw6jhP2KYMk/wVqWB2j2fOqv4g=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useDispatch"]
    ];
});
_c = DashboardLayout;
function _DashboardLayoutAnonymous2(profile_0) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$layout$2f$dashboardLayout$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].extraContainer_profile,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            children: profile_0?.userId?.name || "Unknown User"
        }, void 0, false, {
            fileName: "[project]/src/layout/dashboardLayout/index.jsx",
            lineNumber: 294,
            columnNumber: 77
        }, this)
    }, profile_0._id, false, {
        fileName: "[project]/src/layout/dashboardLayout/index.jsx",
        lineNumber: 294,
        columnNumber: 10
    }, this);
}
function _DashboardLayoutAnonymous(profile) {
    return profile?.userId !== null;
}
function _DashboardLayoutUseSelector(state) {
    return state.auth;
}
var _c;
__turbopack_context__.k.register(_c, "DashboardLayout");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/my_connections/index.module.css [client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "connectedButton": "index-module__ceZrkW__connectedButton",
  "myConnections": "index-module__ceZrkW__myConnections",
  "profilePicture": "index-module__ceZrkW__profilePicture",
  "userCard": "index-module__ceZrkW__userCard",
});
}),
"[project]/src/pages/my_connections/index.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MyConnectionsPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/compiler-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$layout$2f$userLayout$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/layout/userLayout/index.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$layout$2f$dashboardLayout$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/layout/dashboardLayout/index.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-redux/dist/react-redux.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/config/redux/action/authAction/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$my_connections$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/src/pages/my_connections/index.module.css [client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/config/index.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/router.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
;
;
function MyConnectionsPage() {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["c"])(28);
    if ($[0] !== "e157b3b271f5e88ef4b43fee2fe0eda9606325b697c50f40869fec657f034059") {
        for(let $i = 0; $i < 28; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "e157b3b271f5e88ef4b43fee2fe0eda9606325b697c50f40869fec657f034059";
    }
    const dispatch = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useDispatch"])();
    const authState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"])(_MyConnectionsPageUseSelector);
    let t0;
    if ($[1] !== dispatch) {
        t0 = ({
            "MyConnectionsPage[useEffect()]": ()=>{
                dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getMyConnectionRequest"])({
                    token: localStorage.getItem("token")
                }));
            }
        })["MyConnectionsPage[useEffect()]"];
        $[1] = dispatch;
        $[2] = t0;
    } else {
        t0 = $[2];
    }
    let t1;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = [];
        $[3] = t1;
    } else {
        t1 = $[3];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])(t0, t1);
    let t2;
    if ($[4] !== authState.connectionRequest || $[5] !== authState.connections) {
        t2 = ({
            "MyConnectionsPage[useEffect()]": ()=>{
                console.log("auth", authState.connectionRequest);
                console.log("conn", authState.connections);
            }
        })["MyConnectionsPage[useEffect()]"];
        $[4] = authState.connectionRequest;
        $[5] = authState.connections;
        $[6] = t2;
    } else {
        t2 = $[6];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])(t2);
    let t3;
    let t4;
    if ($[7] !== authState.connectionRequest) {
        t3 = ({
            "MyConnectionsPage[useEffect()]": ()=>{
                if (authState.connectionRequest.length != 0) {
                    console.log(authState.connectionRequest);
                }
            }
        })["MyConnectionsPage[useEffect()]"];
        t4 = [
            authState.connectionRequest
        ];
        $[7] = authState.connectionRequest;
        $[8] = t3;
        $[9] = t4;
    } else {
        t3 = $[8];
        t4 = $[9];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])(t3, t4);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"])();
    let t5;
    let t6;
    if ($[10] === Symbol.for("react.memo_cache_sentinel")) {
        t5 = {
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
        };
        t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
            children: "My Connections"
        }, void 0, false, {
            fileName: "[project]/src/pages/my_connections/index.jsx",
            lineNumber: 85,
            columnNumber: 10
        }, this);
        $[10] = t5;
        $[11] = t6;
    } else {
        t5 = $[10];
        t6 = $[11];
    }
    let t7;
    if ($[12] !== authState.connectionRequest.length) {
        t7 = authState.connectionRequest.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
            children: "     No connection request pending"
        }, void 0, false, {
            fileName: "[project]/src/pages/my_connections/index.jsx",
            lineNumber: 94,
            columnNumber: 54
        }, this);
        $[12] = authState.connectionRequest.length;
        $[13] = t7;
    } else {
        t7 = $[13];
    }
    let t8;
    if ($[14] !== authState.connectionRequest || $[15] !== dispatch || $[16] !== router) {
        t8 = authState.connectionRequest.length != 0 && authState.connectionRequest.filter(_MyConnectionsPageAuthStateConnectionRequestFilter).map({
            "MyConnectionsPage[(anonymous)()]": (user, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onClick: {
                        "MyConnectionsPage[(anonymous)() > <div>.onClick]": ()=>{
                            router.push(`/view_profile/${user.userId.username}`);
                        }
                    }["MyConnectionsPage[(anonymous)() > <div>.onClick]"],
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$my_connections$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].userCard,
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: "flex",
                            alignItems: "center",
                            gap: "1.2rem",
                            justifyContent: "space-between"
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$my_connections$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].profilePicture,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                    src: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["BASE_URL"]}/uploads/${user.userId?.profilePic}`,
                                    alt: ""
                                }, void 0, false, {
                                    fileName: "[project]/src/pages/my_connections/index.jsx",
                                    lineNumber: 112,
                                    columnNumber: 51
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/pages/my_connections/index.jsx",
                                lineNumber: 112,
                                columnNumber: 12
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$my_connections$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].userInfo,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        children: user.userId?.name
                                    }, void 0, false, {
                                        fileName: "[project]/src/pages/my_connections/index.jsx",
                                        lineNumber: 112,
                                        columnNumber: 159
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        children: user.userId?.username
                                    }, void 0, false, {
                                        fileName: "[project]/src/pages/my_connections/index.jsx",
                                        lineNumber: 112,
                                        columnNumber: 187
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/pages/my_connections/index.jsx",
                                lineNumber: 112,
                                columnNumber: 126
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: {
                                    "MyConnectionsPage[(anonymous)() > <button>.onClick]": (e)=>{
                                        e.stopPropagation();
                                        dispatch((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$redux$2f$action$2f$authAction$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["acceptConnection"])({
                                            connectionId: user._id,
                                            token: localStorage.getItem("token"),
                                            action: "accept"
                                        }));
                                    }
                                }["MyConnectionsPage[(anonymous)() > <button>.onClick]"],
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$my_connections$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].connectedButton,
                                children: "Accept"
                            }, void 0, false, {
                                fileName: "[project]/src/pages/my_connections/index.jsx",
                                lineNumber: 112,
                                columnNumber: 223
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/pages/my_connections/index.jsx",
                        lineNumber: 107,
                        columnNumber: 102
                    }, this)
                }, index, false, {
                    fileName: "[project]/src/pages/my_connections/index.jsx",
                    lineNumber: 103,
                    columnNumber: 60
                }, this)
        }["MyConnectionsPage[(anonymous)()]"]);
        $[14] = authState.connectionRequest;
        $[15] = dispatch;
        $[16] = router;
        $[17] = t8;
    } else {
        t8 = $[17];
    }
    let t9;
    if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
            children: "My Network"
        }, void 0, false, {
            fileName: "[project]/src/pages/my_connections/index.jsx",
            lineNumber: 132,
            columnNumber: 10
        }, this);
        $[18] = t9;
    } else {
        t9 = $[18];
    }
    let t10;
    if ($[19] !== authState.connectionRequest || $[20] !== router) {
        let t11;
        if ($[22] !== router) {
            t11 = ({
                "MyConnectionsPage[(anonymous)()]": (user_0, index_0)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        onClick: {
                            "MyConnectionsPage[(anonymous)() > <div>.onClick]": ()=>{
                                router.push(`/view_profile/${user_0.userId.username}`);
                            }
                        }["MyConnectionsPage[(anonymous)() > <div>.onClick]"],
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$my_connections$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].userCard,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: "1.2rem",
                                justifyContent: "space-between"
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$my_connections$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].profilePicture,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                        src: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["BASE_URL"]}/uploads/${user_0.userId?.profilePic}`,
                                        alt: ""
                                    }, void 0, false, {
                                        fileName: "[project]/src/pages/my_connections/index.jsx",
                                        lineNumber: 151,
                                        columnNumber: 53
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/pages/my_connections/index.jsx",
                                    lineNumber: 151,
                                    columnNumber: 14
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$my_connections$2f$index$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].userInfo,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            children: user_0.userId?.name
                                        }, void 0, false, {
                                            fileName: "[project]/src/pages/my_connections/index.jsx",
                                            lineNumber: 151,
                                            columnNumber: 163
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: user_0.userId?.username
                                        }, void 0, false, {
                                            fileName: "[project]/src/pages/my_connections/index.jsx",
                                            lineNumber: 151,
                                            columnNumber: 193
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/pages/my_connections/index.jsx",
                                    lineNumber: 151,
                                    columnNumber: 130
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/pages/my_connections/index.jsx",
                            lineNumber: 146,
                            columnNumber: 106
                        }, this)
                    }, index_0, false, {
                        fileName: "[project]/src/pages/my_connections/index.jsx",
                        lineNumber: 142,
                        columnNumber: 66
                    }, this)
            })["MyConnectionsPage[(anonymous)()]"];
            $[22] = router;
            $[23] = t11;
        } else {
            t11 = $[23];
        }
        t10 = authState.connectionRequest.filter(_MyConnectionsPageAuthStateConnectionRequestFilter2).map(t11);
        $[19] = authState.connectionRequest;
        $[20] = router;
        $[21] = t10;
    } else {
        t10 = $[21];
    }
    let t11;
    if ($[24] !== t10 || $[25] !== t7 || $[26] !== t8) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$layout$2f$userLayout$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$layout$2f$dashboardLayout$2f$index$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: t5,
                    children: [
                        t6,
                        t7,
                        t8,
                        t9,
                        t10
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/pages/my_connections/index.jsx",
                    lineNumber: 167,
                    columnNumber: 40
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/pages/my_connections/index.jsx",
                lineNumber: 167,
                columnNumber: 23
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/pages/my_connections/index.jsx",
            lineNumber: 167,
            columnNumber: 11
        }, this);
        $[24] = t10;
        $[25] = t7;
        $[26] = t8;
        $[27] = t11;
    } else {
        t11 = $[27];
    }
    return t11;
}
_s(MyConnectionsPage, "Doocw6ce9ej70EK/bk+Le9f03CI=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useDispatch"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$dist$2f$react$2d$redux$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["useSelector"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = MyConnectionsPage;
function _MyConnectionsPageAuthStateConnectionRequestFilter2(connection_0) {
    return connection_0.status_accepted !== null;
}
function _MyConnectionsPageAuthStateConnectionRequestFilter(connection) {
    return connection.status_accepted === null;
}
function _MyConnectionsPageUseSelector(state) {
    return state.auth;
}
var _c;
__turbopack_context__.k.register(_c, "MyConnectionsPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/src/pages/my_connections/index.jsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/my_connections";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/src/pages/my_connections/index.jsx [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if (module.hot) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/src/pages/my_connections/index.jsx\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/src/pages/my_connections/index.jsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__a1a5b433._.js.map