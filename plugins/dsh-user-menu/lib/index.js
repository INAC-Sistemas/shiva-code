//#region src/index.ts
/** Loader-visible plugin name; the entry `id` in cordis.patch.yml stays independent. */
const name = "dsh-user-menu";
/**
* Host plugin body: no routes, no services, no session events.
* @param _ctx - the host cordis context, unused.
*/
function apply(_ctx) {}
//#endregion
export { apply, name };
