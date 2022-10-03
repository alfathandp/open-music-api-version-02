const autoBind =require('auto-bind');

class AlbumsHandler {
  constructor(service, songsService, validator) {
    this._service = service;
    this._validator = validator;
    this._songsService = songsService;

    autoBind(this);
  }

  async postAlbumsHandler(request, h) {
    this._validator.validateAlbumsPayload(request.payload);
    const {name, year} = request.payload;

    const albumId = await this._service.addAlbums(name, year);

    const response = h.response({
      status: 'success',
      data: {
        albumId,
      },
    });
    response.code(201);
    return response;
  }

  async getAlbumsByIdHandler(request, h) {
    const {id} = request.params;
    const album = await this._service.getAlbumsById(id);
    const song = await this._songsService.getSongByAlbumId(id);
    album.songs = song;
    return {
      status: 'success',
      data: {
        album,
      },
    };
  }

  async putAlbumsByIdHandler(request, h) {
    this._validator.validateAlbumsPayload(request.payload);
    const {id} = request.params;
    const {name, year} = request.payload;
    await this._service.updateAlbumsById(id, name, year);

    return {
      status: 'success',
      message: ' Album berhasil diperbarui',
    };
  }

  async deleteAlbumsByIdHandler(request, h) {
    const {id} = request.params;
    await this._service.deleteAlbumById(id);
    return {
      status: 'success',
      message: ' Album berhasil dihapus',
    };
  }
};

module.exports = AlbumsHandler;

