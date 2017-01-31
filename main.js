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
        var session = editor.getSession();
        var doc = session.getDocument();
        var AceRange = ace.require('ace/range').Range;
        var ignoreChange = {editor: false, code: false};
        editor.setTheme('ace/theme/terminal');
        session.setMode('ace/theme/javascript');
        editor.setValue(code.getText());
        editor.$blockScrolling = Infinity;
        // Hook up the editor to the model and vice versa
        editor.on("change", function (e) {
          if (ignoreChange.editor) return;
          ignoreChange.code = true;
          switch (e.action) {
            case "insert":
              code.insertString(doc.positionToIndex(e.start, 0), e.lines.join('\n'));
              break;
            case "remove":
              code.removeRange(doc.positionToIndex(e.start, 0), doc.positionToIndex(e.end, 0));
              break;
          }
          ignoreChange.code = false;
        });
        code.addEventListener(gapi.drive.realtime.EventType.TEXT_DELETED, function (e) {
          if (ignoreChange.code) return;
          var startIdx = e.index;
          var endIdx = startIdx + e.text.length;
          var startPos = doc.indexToPosition(startIdx, 0);
          var endPos = doc.indexToPosition(endIdx, 0);
          var range = new AceRange(startPos.row, startPos.column, endPos.row, endPos.column);
          ignoreChange.editor = true;
          session.remove(range);
          ignoreChange.editor = false;
        });
        code.addEventListener(gapi.drive.realtime.EventType.TEXT_INSERTED, function (e) {
          if (ignoreChange.code) return;
          ignoreChange.editor = true;
          session.insert(doc.indexToPosition(e.index, 0), e.text);
          ignoreChange.editor = false;
        });
      }
