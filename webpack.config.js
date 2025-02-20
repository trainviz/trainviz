const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
    mode: "development",
    devtool: "eval",
    entry: {
        main: "./src/index.js"
    },
    output: {
        filename: "[name].[contenthash].js",
        path: path.resolve(__dirname, "./dist")
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, "css-loader"]
            }
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({filename: "[name].[contenthash].css"}),
        new HtmlWebpackPlugin({ template: "./src/index.html", filename: "index.html", chunks: ["main"] }),
        new CopyWebpackPlugin({ patterns: [{ from: "src/assets", to: "assets" }] }),
        new CleanWebpackPlugin()
    ],
    devServer: {
        port: 5000,
        static: {
            directory: "./"
        },
        open: true
    }
}