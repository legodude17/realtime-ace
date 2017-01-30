var clientId = localStorage.getItem('realaceclid') || prompt('What is the client id?');

      if (!/^([0-9])$/.test(clientId[0])) {
        alert('Invalid Client ID');
      }
localStorage.setItem('realaceclid', clientId);
      // Create a new instance of the realtime utility with your client ID.
      var realtimeUtils = new utils.RealtimeUtils({ clientId: clientId });

      authorize();

      function authorize() {
        // Attempt to authorize
        realtimeUtils.authorize(function(response){
          if(response.error){
            // Authorization failed because this is the first time the user has used your application,
            // show the authorize button to prompt them to authorize manually.
            var button = document.getElementById('auth_button');
            button.classList.add('visible');
            button.addEventListener('click', function () {
              realtimeUtils.authorize(function(response){
                start();
              }, true);
            });
          } else {
              start();
          }
        }, false);
      }

      function start() {
        // With auth taken care of, load a file, or create one if there
        // is not an id in the URL.
        var id = realtimeUtils.getParam('id');
        if (id) {
          // Load the document id from the URL
          realtimeUtils.load(id.replace('/', ''), onFileLoaded, onFileInitialize);
        } else {
          // Create a new document, add it to the URL
          realtimeUtils.createRealtimeFile(prompt('What filename?'), function(createResponse) {
            window.history.pushState(null, null, '?id=' + createResponse.id);
            realtimeUtils.load(createResponse.id, onFileLoaded, onFileInitialize);
          });
        }
      }

      // The first time a file is opened, it must be initialized with the
      // document structure. This function will add a collaborative string
      // to our model at the root.
      function onFileInitialize(model) {
        var string = model.createString();
        string.setText('console.log("Hello, world!");');
        model.getRoot().set('code', string);
      }

      // After a file has been initialized and loaded, we can access the
      function onFileLoaded(doc) {
        var code = doc.getModel().getRoot().get('code');
        var editor = ace.edit('editor');
        editor.setTheme('ace/theme/terminal');
        editor.getSession().setMode('ace/theme/javascript');
        // Hook up the editor to the model and vice versa
        editor.on("change", function () {
          code.setText(editor.getValue());
        });
        code.addEventListener(gapi.drive.realtime.EventType.TEXT_DELETED, function () {
          editor.setValue(code.getText());
        });
        code.addEventListener(gapi.drive.realtime.EventType.TEXT_INSERTED, function () {
          editor.setValue(code.getText());
        });
      }
