Sistema de Arquivos Criptografados em Servidor Web Local e Browser
================================================

Descrição - Objetivo Geral
------------
Desenvolver um sistema (cliente e servidor) que permite usuários gravarem dados em um servidor local não confiável, de forma criptografada. O servidor não deverá ser capaz de observar os dados enviados pelos usuários e também não deverá ser capaz de corromper os arquivos enviados sem que isto seja notado. O sistema deverá permitir a coexistência de diferentes usuários que podem compartilhar arquivos entre si, logo para cada arquivo deverá ser possível controlar o conjunto de usuários que podem ler e/ou escrever para aquele arquivo.

Requisitos
------------
Node.js
PostgreSQL

Gerar novas chaves Servidor
---------------
~~~~~~~~~~~~~~~~~~
npm generate
~~~~~~~~~~~~~~~~~~

SQL - Implementar no PostgreSQL
---
~~~~~~~~~~~~~~~~~~
SQL.txt
~~~~~~~~~~~~~~~~~~
atualizar .env

Executar
---
~~~~~~~~~~~~~~~~~~
npm start
~~~~~~~~~~~~~~~~~~
Inicia web server com websockets na porta 3000
