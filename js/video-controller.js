var videoController = {
    data: {
        config: null
    },
    uiElements: {
        videoCardTemplate: null,
        videoList: null,
        loadingIndicator: null
    },
    init: function (config) {
        this.uiElements.videoCardTemplate = $('#video-template');
        this.uiElements.videoList = $('#video-list');
        this.uiElements.loadingIndicator = $('#loading-indicator');
        this.uiElements.transcodingIndicator = $('.transcoding-indicator');
        this.data.config = config;
        this.connectToFirebase();
    },
    addVideoToScreenBatch: function (videoId, videoObj, url) {
        var newVideoElement = this.uiElements.videoCardTemplate
            .clone().attr('id', videoId);
        newVideoElement.click(function() {
            var video = newVideoElement.find('video').get(0);
            if (newVideoElement.is('.video-playing')) {
                video.pause();
                $(video).removeAttr('controls');
            }
            else {
                $(video).attr('controls', '');
                video.play();
            }
            newVideoElement.toggleClass('video-playing');
        });

        this.updateVideoOnScreenBatch(newVideoElement, videoObj, url);
        this.uiElements.videoList.prepend(newVideoElement);
    },
    updateVideoOnScreenBatch: function(videoElement, videoObj, url) {

        console.log("updateVideoOnScreenBatch called!");
        console.log(videoObj);

        if (!videoObj)
        {
            return;
        }
        if (videoObj.transcoding) {
            videoElement.find('video').hide();
            videoElement.find('.transcoding-indicator').show();
        } else {
            videoElement.find('video').show();
            videoElement.find('.transcoding-indicator').hide();
            videoElement.find('video').attr('src', url);
        }
    },
    getElementForVideo: function(videoId) {
        return $('#' + videoId);
    },
    connectToFirebase: function () {
        var newItems = false;
        var that = this;
        firebase.initializeApp(this.data.config.firebase);
        var isConnectedRef = firebase.database().ref('.info/connected');
        var nodeRef = firebase.database().ref('videos');
        isConnectedRef.on('value', function(snap) {
            if (snap.val() === true) {
                that.uiElements.loadingIndicator.hide();
                that.uiElements.transcodingIndicator.hide();
            }
        });
        nodeRef
            .on('child_added', function (childSnapshot) {

                if(!newItems) {
                    return;
                }

                if(childSnapshot.val()) {

                    var objectMap = [{
                        firebaseId: childSnapshot.key,
                        key: childSnapshot.val().key,
                        transcoding: childSnapshot.val().transcoding
                    }];

                    if(objectMap[0].transcoding == true) {
                        that.addVideoToScreenBatch(objectMap[0].firebaseId,
                            objectMap[0], null);
                    }
                    else {
                        that.getSignedUrls(objectMap);
                    }
                }
            });

        nodeRef
            .once('value', function (childSnapshot) {

                newItems = true;

                if(childSnapshot.val()) {

                    var objectMap = [];

                    for(key in childSnapshot.val()) {

                        if (childSnapshot.val().hasOwnProperty(key)) {

                            var fbObject = {
                                firebaseId: key,
                                key: childSnapshot.val()[key].key,
                                transcoding: childSnapshot.val()[key].transcoding
                            };

                            objectMap.push(fbObject);
                        }
                    }

                    that.getSignedUrls(objectMap);
                }
            });

        nodeRef
            .on('child_changed', function (childSnapshot) {

                if(childSnapshot.val()) {

                    var objectMap = [{
                        firebaseId: childSnapshot.key,
                        key: childSnapshot.val().key,
                        transcoding: childSnapshot.val().transcoding
                    }];

                    if(objectMap[0].transcoding == true) {
                        that.updateVideoOnScreenBatch(that.getElementForVideo
                        (objectMap[0].firebaseId), objectMap[0], null);
                    }
                    else {
                        that.getUpdatedSignedUrls(objectMap);
                    }
                }
            });
    },
    getSignedUrls: function(objectMap) {

        var getSignedUrl = this.data.config.apiBaseUrl + '/signed-url';
        var that = this;

        $.post(getSignedUrl, JSON.stringify(objectMap),
            function(data, status) {

                if(status == "success") {

                    for(var j = 0; j < objectMap.length; j++) {
                        for(var k = 0; k < data.urls.length; k++) {
                            if(objectMap[j].firebaseId === data.urls[k].firebaseId) {
                                that.addVideoToScreenBatch(objectMap[j].firebaseId,
                                    objectMap[j], data.urls[k].url);
                            }
                        }
                    }
                } else {
                    console.log('Error requesting signed urls.');
                }
            });
    },
    getUpdatedSignedUrls: function(objectMap) {

        var getSignedUrl = this.data.config.apiBaseUrl + '/signed-url';
        var that = this;

        $.post(getSignedUrl, JSON.stringify(objectMap),
            function(data, status) {

                if(status == "success") {

                    for(var j = 0; j < objectMap.length; j++) {
                        for(var k = 0; k < data.urls.length; k++) {
                            if(objectMap[j].firebaseId === data.urls[k].firebaseId) {
                                that.updateVideoOnScreenBatch(that.getElementForVideo
                                (objectMap[j].firebaseId), objectMap[j], data.urls[k].url);
                            }
                        }
                    }
                } else {
                    console.log('Error requesting signed urls.');
                }
            });
    }
};
