type BrontieProviderOptions = {
    sdk?: Record<string, any>;
    test?: boolean;
    testopts?: Record<string, any>;
};
declare function BrontieProvider(this: any, options: BrontieProviderOptions): {
    exports: {
        sdk: () => any;
    };
};
export default BrontieProvider;
