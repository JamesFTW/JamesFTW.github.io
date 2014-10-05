//Front end code
var form = $('#createPLForm').serializeArray();
var canvas = document.getElementById('#canvas');
var dataURL = canvas.toDataURL();
$.ajax({
  type: "POST",
  url: "/savePlaylist",
  data: { 
     imgBase64: dataURL,
     playlistName: form[0].value,
     desc: form[1].value
        },
  dataType: 'json',
  success: function(data, textStatus, jqXHR){
    if(jQuery.type(data.redirect) == 'string')
        window.location = data.redirect;
    }
});



//create knox AWS client.
var AWSclient = knox.createClient({
  key: config.AWS.key,
  secret: config.AWS.secret,
  bucket: config.AWS.bucket
});

//on post save to S3
app.post('/savePlaylist', ensureAuthenticated, function(req, res){
    var pl = new Playlist({
      name: req.body.playlistName,
      creatorID: req.user.oauthID,
      creatorName: req.user.name,
      description: req.body.desc,
      songs: []
    });
    var img = req.body.imgBase64;
    var data = img.replace(/^data:image\/\w+;base64,/, "");
    var buf = new Buffer(data, 'base64');

    var re = AWSclient.put(pl._id+'.png', {
      'Content-Length': buf.length,
      'Content-Type': 'img/png'
    });
    re.on('response', function(resp){
      if(200 == resp.statusCode) {
        console.log("Uploaded to" + re.url);
        pl.coverImg = re.url; //prepare to save image url in the database
        pl.save(function(error){
          if(error) console.log(error);
          else{
             var ruri = '/playlist?id=' + pl._id;
             res.send({redirect: ruri});
          }
        });
      }
      else
        console.log("ERROR");
    });
    re.end(buf);
});