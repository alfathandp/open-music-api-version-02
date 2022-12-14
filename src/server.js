/* eslint-disable max-len */
require('dotenv').config();
const Jwt = require('@hapi/jwt');
const Hapi = require('@hapi/hapi');

const albums = require('./api/albums');
const songs = require('./api/songs');
const AlbumsService = require('./service/postgres/AlbumsService');
const SongsService = require('./service/postgres/SongsService');
const albumsValidator = require('./validator/albums');
const songsValidator = require('./validator/songs');

// user
const UsersService = require('./service/postgres/UsersService');
const usersValidator = require('./validator/users');
const users = require('./api/users');

// authentications
const authentications = require('./api/authentications');
const AuthenticationsService = require('./service/postgres/AuthenticationsService');
const TokenManager = require('./tokenize/TokenManager');
const AuthenticationsValidator = require('./validator/authentications');

// playlists
const PlaylistsService = require('./service/postgres/PlaylistsService');
const playlists = require('./api/playlists');
const PlaylistsValidator = require('./validator/playlists');

// playlist_songs junction
const playlistSongs = require('./api/playlistSongs');
const SongsAtPlaylistValidator = require('./validator/playlist_songs_junction');
const SongsAtPlaylistService = require('./service/postgres/Playlist_songs_junction');
const ClientError = require('./exceptions/ClientError');

// Collaborations
const CollaborationsService = require('./service/postgres/CollaborationsService');
const collaborations = require('./api/collaborations');
const CollabsValidator = require('./validator/collaborations');


const init = async () => {
  const collaborationsService = new CollaborationsService();
  const albumsService = new AlbumsService();
  const songsService = new SongsService();
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();
  const playlistsService = new PlaylistsService();
  const songsAtPlaylistService = new SongsAtPlaylistService(collaborationsService, playlistsService);

  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  });

  // onPreResponse utk mencegah boilerplate code
  server.ext('onPreResponse', (request, h) => {
    // mendapat konteks response dari request
    const {response} = request;
    if (response instanceof Error) {
      // handling client error
      if (response instanceof ClientError) {
        const newResponse = h.response({
          status: 'fail',
          message: response.message,
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }
      // mempertahankan handling client error oleh hapi (404,dll)
      if (!response.isServer) {
        return h.continue;
      }
      // handling server error
      const newResponse = h.response({
        status: 'error',
        message: ' Maaf, Server kami sedang bermasalah',
      });
      newResponse.code(500);
      console.error(response);
      return newResponse;
    }
    // jika bukan error, lanjut response sebelumnya
    return h.continue;
  });

  // registrasi plugin eksternal
  await server.register([
    {
      plugin: Jwt,
    },
  ]);

  // JWT Auth strategy
  server.auth.strategy('openmusic_jwt', 'jwt', {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id,
        username: artifacts.decoded.payload.username,
      },
    }),
  });

  await server.register([
    {
      plugin: albums,
      options: {
        service: albumsService,
        validator: albumsValidator,
      },
    },
    {
      plugin: songs,
      options: {
        service: songsService,
        validator: songsValidator,
      },
    },
    {
      plugin: users,
      options: {
        service: usersService,
        validator: usersValidator,
      },
    },
    {
      plugin: authentications,
      options: {
        UsersService: usersService,
        AuthenticationsService: authenticationsService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator,
      },
    },
    {
      plugin: playlists,
      options: {
        service: playlistsService,
        validator: PlaylistsValidator,
      },
    },
    {
      plugin: playlistSongs,
      options: {
        songsAtPlaylistService,
        validator: SongsAtPlaylistValidator,
      },
    },
    {
      plugin: collaborations,
      options: {
        service: collaborationsService,
        playlistsService,
        validator: CollabsValidator,
      },
    },
  ]);
  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

init();


