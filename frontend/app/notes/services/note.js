angular.module('app.notes').factory('Note', Note);

Note.$inject = ['$resource'];
function Note($resource) {
    var _note = $resource(
        '/api/notes/:id/',
        null,
        {
            query: {
                isArray: false,
            },
            update: {
                method: 'PATCH',
                params: {
                    id: '@id',
                },
            },
        }
    );
    return _note;
}
