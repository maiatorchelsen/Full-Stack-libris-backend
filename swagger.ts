import swaggerAutogen from "swagger-autogen";
const doc = {
info: {
title: "API da Livraria Libris",
description: "Documentação da API da livraria online Libris",
version: "1.0.0"
},
servers: [{url: "http://localhost:3000"}
]
};
const outputFile = "./swagger-output.json";
// Arquivo principal que registra as rotas
const routes = ["./src/server.ts"];
swaggerAutogen({ openapi: "3.0.0" })(
outputFile,
routes,
doc
);