//#region Check model new form
async function isServerActionCreateView_fromURL(url) {
    return await isModelCreateView_fromURL(url, 'ir.actions.server');
}

async function isModelCreateView_fromURL(url, model) {
    url = typeof url === 'object' ? url : new URL(url);

    let pathname = url.pathname;
    if (pathname.startsWith('/odoo')) {
        pathname = pathname.replace(/^\/odoo/, ''); // ^ for start of string
        return await isModelCreateView_V2(pathname, model);
    }

    return isModelCreateView_V1(url, model);
}

async function isModelCreateView_V1(url, model) {
    const search = url.searchParams;
    if (!search.has('model') || search.get('model') !== model) return false;
    if (!search.has('view_type') || search.get('view_type') != 'form') return false;
    return true;
}
async function isModelCreateView_V2(pathname, model) {
    const endWithNewPattern = /\/.+\/new$/; // $ for end of string
    if (!endWithNewPattern.test(pathname)) return false;

    const paths = pathname.split('/');
    const pathAction = paths[paths.length - 2];

    const actionWindow = await getActionWindowFromPath(pathAction);
    if (!actionWindow) return false;
    if (actionWindow.res_model !== model) return false;
    return true;
}
//#endregion

//#region Get model ID
async function getProjectTaskID_fromURL(url) {
    return (await getModelAndID_fromURL(url, 'project.task'))?.id;
}

async function getKnowledgeArticleID_fromURL(url) {
    return (await getModelAndID_fromURL(url, 'knowledge.article'))?.id;
}

async function getModelAndID_fromURL(url, model = undefined) {
    url = typeof url === 'object' ? url : new URL(url);

    // 17.2 URL doesn't contains the model anymore, only the path of an action
    // /odoo/act-824/66
    // /odoo/project/10/tasks/66
    let pathname = url.pathname;
    if (pathname.startsWith('/odoo')) {
        // Remove "/odoo" prefix
        pathname = pathname.replace(/^\/odoo/, ''); // ^ for start of string
        return await getModelAndID_V2(pathname, model);
    }

    return getModelAndID_V1(url, model);
}

function getModelAndID_V1(url, model) {
    const search = url.searchParams;
    if (model && (!search.has('model') || search.get('model') !== model)) return undefined;
    if (!search.has('view_type') || search.get('view_type') != 'form') return undefined;
    if (!search.has('id')) return undefined;
    const id = parseInt(search.get('id'));
    return { id: isNaN(id) ? undefined : id, model: model || search.get('model') };
}

async function getModelAndID_V2(pathname, model) {
    const endWithDigitsPattern = /\/.+\/\d+$/; // $ for end of string
    if (!endWithDigitsPattern.test(pathname)) return undefined;

    const paths = pathname.split('/');
    const pathID = parseInt(paths[paths.length - 1]);
    const pathAction = paths[paths.length - 2];

    const actionWindow = await getActionWindowFromPath(pathAction);
    if (!actionWindow) return undefined;
    if (model && actionWindow.res_model !== model) return undefined;

    return { id: isNaN(pathID) ? undefined : pathID, model: model || actionWindow.res_model };
}
//#endregion

const actionWindowFields = [
    'id',
    'name',
    'xml_id',
    'domain',
    'context',
    'limit',
    'filter',
    'res_model',
];
async function getActionWindow_fromURL(url) {
    url = typeof url === 'object' ? url : new URL(url);

    // 17.2 URL doesn't contains the model anymore, only the path of an action
    // /odoo/act-824/66
    // /odoo/project/10/tasks/66
    let pathname = url.pathname;
    if (pathname.startsWith('/odoo')) {
        // Remove "/odoo" prefix
        pathname = pathname.replace(/^\/odoo/, ''); // ^ for start of string
        return await getActionWindow_V2(pathname);
    }

    return getActionWindow_V1(url);
}
async function getActionWindow_V1(url) {
    const search = url.searchParams;

    if (!search.has('action')) return undefined;
    const id = parseInt(search.get('action'));
    if (isNaN(id)) return undefined;

    const actionWindow = await getActionWindowWithID(id, actionWindowFields);
    if (!actionWindow) return undefined;
    return actionWindow;
}
async function getActionWindow_V2(pathname) {
    const paths = pathname.split('/');
    const pathAction = paths[paths.length - 1];

    const actionWindow = await getActionWindowFromPath(pathAction, actionWindowFields);
    if (!actionWindow) return undefined;
    return actionWindow;
}

//#region Get Action Window
async function getActionWindowFromPath(pathAction, fields = ['res_model']) {
    const windowActionPathPattern = /^act-\d+$/; // $ for end of string
    let actionWindow = false;

    if (windowActionPathPattern.test(pathAction)) {
        const pathActionID = parseInt(pathAction.replace(/^act-/, ''));
        actionWindow = await getActionWindowWithID(pathActionID, fields);
    } else {
        actionWindow = await getActionWindowWithPath(pathAction, fields);
    }

    if (!actionWindow) return undefined;
    return actionWindow;
}
async function getActionWindowWithPath(path, fields) {
    if (!path) return undefined;
    return await getActionWindow([['path', '=', path]], fields);
}
async function getActionWindowWithID(id, fields) {
    return await getActionWindow([['id', '=', id]], fields);
}
async function getActionWindow(domain, fields) {
    const response = await fetch(
        new Request(`/web/dataset/call_kw/ir.actions.act_window/search_read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    args: [],
                    kwargs: {
                        context: { active_test: false },
                        fields: fields,
                        domain: domain,
                        limit: 1,
                    },
                    model: 'ir.actions.act_window',
                    method: 'search_read',
                },
            }),
        })
    );

    const data = await response.json();

    if (data.result?.length === 0) return undefined;
    if (data.result === undefined) return undefined;

    return data.result[0];
}
//#endregion