var API_KEY = 'AIzaSyB53eOcfiDxRuIr-kakVIl1vIzBa9rQHD8';
  
var items = [];
  
$(function() {
    $('#btn-search').click(search);
    $('#btn-submit').click(submit);
});

function handleClientLoad() {
    gapi.client.setApiKey(API_KEY);
    gapi.client.load('youtube', 'v3');
}

function submit(event) {
    if ($('input[name=title]').val() === "") {
        event.preventDefault();
        $('.alert').empty();
        $('.alert').append('Cannot create a playlist without a name.');
        $('.alert').show();
        return;
    }
    
    var videoIds = "";
    $('.playlist-item').each(function (element) {
        videoIds = videoIds + $(this).attr('data-video-id') + ',';
    });
    
    if (videoIds === "") {
        event.preventDefault();
        $('.alert').empty();
        $('.alert').append('Cannot create a playlist without videos.');
        $('.alert').show();
        return;
    }
    
    $('#hidden-videoids').val(videoIds);
}

function search() {
    var query = $( "input[name='query']" ).val();
    
    var request = gapi.client.youtube.search.list({
        q: query,
        part: 'id,snippet',
        type: 'video'
    });

    request.execute(function(response) {
        items = response.result.items;
        
        $('#result').empty();
        for (var i = 0; i < items.length; i++) {
            var snippet = items[i].snippet;
            var clonedDiv = $('#searchresult-template').clone();
            clonedDiv.attr('data-search-idx', i);
            clonedDiv.find('#resultimg').attr('src', snippet.thumbnails.default.url);
            clonedDiv.find('#resultname').append(snippet.title);
            console.log(clonedDiv.children('#resultimg'));
            clonedDiv.show();
            
            $('#result').append(clonedDiv);
        }
        $('.searchresult').click(onResultClick);
    });
}

function onResultClick(event) {
    var video = items[$(event.currentTarget).attr('data-search-idx')];
    var videoId = video.id.videoId;
    if($('.playlist-item[data-video-id='+videoId+']').length > 0) {
        return;
    }
    
    var clonedDiv = $('#playlist-item-template').clone();
    clonedDiv.attr('data-video-id', videoId);
    clonedDiv.find('#itemimg').attr('src', video.snippet.thumbnails.default.url);
    clonedDiv.find('#itemtitle').prepend(video.snippet.title);
    clonedDiv.find('#itembutton').attr('data-video-id', videoId);
    console.log(clonedDiv.children('#resultimg'));
    clonedDiv.show();
    $('#playlist-videos').append(clonedDiv);
    
    $('.btn-remove').click(onRemoveClick);
}

function onRemoveClick(event) {
    var video_id = $(event.target).attr('data-video-id');
    $('.playlist-item[data-video-id='+video_id+']').remove();
}