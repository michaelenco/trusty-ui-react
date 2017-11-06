var path = require("path");
var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var Clean = require("clean-webpack-plugin");
var git = require("git-rev-sync");
require("es6-promise").polyfill();

// BASE APP DIR
var root_dir = path.resolve(__dirname);

module.exports = function(env) {
    // if (!env.profile) {
    //     console.log("env:", env);
    // }
    // console.log(env.prod ? "Using PRODUCTION options\n" : "Using DEV options\n");
    // STYLE LOADERS
    var cssLoaders = [
        {
            loader: "style-loader"
        },
        {
            loader: "css-loader"
        },
        {
            loader: "postcss-loader"
        }
    ];

    var scssLoaders =  [
        {
            loader: "style-loader"
        },
        {
            loader: "css-loader"
        },
        {
            loader: "postcss-loader",
            options: {
                plugins: [require("autoprefixer")]
            }
        },
        {
            loader: "sass-loader",
            options: {
                outputStyle: "expanded"
            }
        }
    ];

    // OUTPUT PATH
    var outputPath = path.join(root_dir, "assets");

    // COMMON PLUGINS
    const baseUrl = env.electron ? "" : "baseUrl" in env ? env.baseUrl : "/";
    var plugins = [
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.DefinePlugin({
            APP_VERSION: JSON.stringify(git.tag()),
            __ELECTRON__: !!env.electron,
            __HASH_HISTORY__: !!env.hash,
            __BASE_URL__: JSON.stringify(baseUrl),
            __UI_API__: JSON.stringify(env.apiUrl || "https://ui.bitshares.eu/api"),
            __TESTNET__: !!env.testnet
        })
    ];

    if (env.prod) {
        // PROD OUTPUT PATH
        let outputDir = env.electron ? "electron" : env.hash ? `hash-history_${baseUrl.replace("/", "")}` : "dist";
        outputPath = path.join(root_dir, "build", outputDir);

        // DIRECTORY CLEANER
        var cleanDirectories = [outputPath];

        // WRAP INTO CSS FILE
        const extractCSS = new ExtractTextPlugin("app.[contenthash:8].css");
        cssLoaders = ExtractTextPlugin.extract({
            fallback: "style-loader",
            use: [{loader: "css-loader"}, {loader: "postcss-loader", options: {
                plugins: [require("autoprefixer")]
            }}]}
        );
        scssLoaders = ExtractTextPlugin.extract({fallback: "style-loader",
            use: [{loader: "css-loader"}, {loader: "postcss-loader", options: {
                plugins: [require("autoprefixer")]
            }}, {loader: "sass-loader", options: {outputStyle: "expanded"}}]}
        );

        // PROD PLUGINS

        plugins.push(
            new webpack.optimize.CommonsChunkPlugin({
                name: 'vendor',
                filename: 'vendor.[chunkhash].js',
                minChunks: Infinity
            })
        ),
        plugins.push(
            new webpack.optimize.CommonsChunkPlugin({ 
                name: 'meta', 
                chunks: ['vendor'], 
                filename: 'meta.[hash].js' 
            })
        )
        plugins.push(new webpack.NamedModulesPlugin())
        plugins.push(new HtmlWebpackPlugin({
            title: "Trusty",
            template: path.resolve(__dirname,'app', 'assets','trusty.html'),
            filename: path.join(__dirname, 'build', 'dist', 'index.html')
        }))
        plugins.push(new Clean(cleanDirectories, {root: root_dir}));
        plugins.push(new webpack.DefinePlugin({
            "process.env": {NODE_ENV: JSON.stringify("production")},
            __DEV__: false
        }));
        plugins.push(extractCSS);
        plugins.push(new webpack.LoaderOptionsPlugin({
            minimize: true,
            debug: false
        }));
        plugins.push(new webpack.optimize.ModuleConcatenationPlugin());
        if (!env.noUgly) {

            plugins.push(new webpack.optimize.UglifyJsPlugin({
                sourceMap: true,
                compress: {
                    warnings: true
                },
                output: {
                    screw_ie8: true
                }
            }));
        }
    } else {
        // plugins.push(new webpack.optimize.OccurenceOrderPlugin());
        plugins.push(new webpack.DefinePlugin({
            "process.env": {NODE_ENV: JSON.stringify("development")},
            __DEV__: true
        }));
        plugins.push(new webpack.HotModuleReplacementPlugin());
        plugins.push(new webpack.NoEmitOnErrorsPlugin());
    }

    var config = {
        entry: {
            // vendor: ["react", "react-dom", "highcharts/highstock", "bitsharesjs", "lodash"],
            app: env.prod ?
            path.resolve(root_dir, "app/Main.js") :
            [
                "react-hot-loader/patch",
                "webpack-hot-middleware/client",
                path.resolve(root_dir, "app/Main-dev.js")
            ],
            vendor: [
                "alt",
                "alt-container",
                "alt-react",
                "bignumber.js",
                //"bitsharesjs",
                "classnames",
                 "cookies-js",
                "counterpart",
                 "event-emitter",
                "event-listener",
                "file-saver",
                //"foundation-apps",
                "fractional",
                "highcharts",
                "immutable",
                "indexeddbshim",
                "intl",
                "jdenticon",
                 "jquery",
                "js-sha256",
                "lodash",
                "lzma",
                //"node-fetch",
                "numeral",
                "object-assign",
                "perfect-scrollbar",
                "qrcode.react",
                "react",
                "react-clipboard.js",
                "react-dom",
               //"react-foundation-apps",
                "react-highcharts",
                "react-hot-loader",
                "react-interpolate-component",
                "react-intl",
                "react-json-inspector",
                "react-notification-system",
                "react-popover",
                "react-responsive-mixin",
                "react-router",
                "react-stockcharts",
                "react-tooltip",
                "react-transition-group",
                "react-translate-component",
                "react-tabs-redux",
                "tcomb",
                "whatwg-fetch",
                "zxcvbn"
            ]
        },
        output: {
            publicPath: env.prod ? "" : "/",
            path: outputPath,
            filename: env.prod ? "[name].[hash:8].js":"[name].js",
            pathinfo: !env.prod,
            sourceMapFilename: "[name].js.map"
        },
        devtool: env.prod ? "cheap-module-source-map" : "eval",
        module: {
            rules: [
                {
                    test: /\.jsx$/,
                    include: [path.join(root_dir, "app"), path.join(root_dir, "node_modules/react-foundation-apps")],
                    use: [
                        {
                            loader: "babel-loader",
                            options: {
                                cacheDirectory: env.prod ? false : true
                            }
                        }
                    ]
                },
                {
                    test: /\.js$/,
                    exclude: [/node_modules/],
                    loader: "babel-loader",
                    options: {compact: false, cacheDirectory: true}
                },
                {
                    test: /\.json/, loader: "json-loader",
                    exclude: [
                        path.resolve(root_dir, "app/lib/common"),
                        path.resolve(root_dir, "app/assets/locales")
                    ]
                },
                { test: /\.coffee$/, loader: "coffee-loader" },
                { test: /\.(coffee\.md|litcoffee)$/, loader: "coffee-loader?literate" },
                {
                    test: /\.css$/,
                    use: cssLoaders
                },
                {
                    test: /\.scss$/,
                    use: scssLoaders
                },
                {
                    test: /\.png$/,
                    exclude:[path.resolve(root_dir, "app/assets/asset-symbols"), path.resolve(root_dir, "app/assets/language-dropdown/img")],
                    use: [
                        {
                            loader: "url-loader",
                            options: {
                                limit: 100000
                            }
                        }
                    ]
                },

                {
                    test: /\.woff$/,
                    use: [
                        {
                            loader: "url-loader",
                            options: {
                                limit: 100000,
                                mimetype: "application/font-woff"
                            }
                        }
                    ]
                },
                { test: /.*\.svg$/, loaders: ["svg-inline-loader", "svgo-loader"] },
                {
                    test: /\.md/,
                    use: [
                        {
                            loader: "html-loader",
                            options: {
                                removeAttributeQuotes: false
                            }
                        },
                        {
                            loader: "remarkable-loader",
                            options: {
                                preset: "full",
                                typographer: true
                            }
                        }
                    ]
                }
            ]
        },
        resolve: {
            modules: [
                path.resolve(root_dir, "app"),
                path.resolve(root_dir, "app/lib"),
                "node_modules"
            ],
            extensions: [".js", ".jsx", ".coffee", ".json"]
        },
        plugins: plugins
    };

    return config;
};
