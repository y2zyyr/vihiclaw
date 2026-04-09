export function defineTool(name, description, parameters, execute, options) {
    return {
        name,
        description,
        parameters,
        isConcurrencySafe: options?.isConcurrencySafe ?? false,
        execute,
    };
}
//# sourceMappingURL=base.js.map