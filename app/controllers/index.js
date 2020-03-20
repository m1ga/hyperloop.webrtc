var AudioSource = require("org.webrtc.AudioSource");
var AudioTrack = require("org.webrtc.AudioTrack");
var Camera1Enumerator = require("org.webrtc.Camera1Enumerator");
var Camera2Enumerator = require("org.webrtc.Camera2Enumerator");
var CameraEnumerator = require("org.webrtc.CameraEnumerator");
var CameraVideoCapturer = require("org.webrtc.CameraVideoCapturer");
var EglBase = require("org.webrtc.EglBase");
var Logging = require("org.webrtc.Logging");
var EglBase14 = require('org.webrtc.EglBase14');
var MediaConstraints = require("org.webrtc.MediaConstraints");
var PeerConnectionFactory = require("org.webrtc.PeerConnectionFactory");
var SurfaceViewRenderer = require("org.webrtc.SurfaceViewRenderer");
var VideoCapturer = require("org.webrtc.VideoCapturer");
var VideoRenderer = require("org.webrtc.VideoRenderer");
var VideoSource = require("org.webrtc.VideoSource");
var MediaStream = require("org.webrtc.MediaStream");
var CameraCapturer = require("org.webrtc.CameraCapturer");
var VideoTrack = require("org.webrtc.VideoTrack");
var Activity = require('android.app.Activity');
var LayoutParams = require("android.widget.FrameLayout.LayoutParams");
var ViewGroupLayoutParams = require('android.view.ViewGroup.LayoutParams');
var Gravity = require('android.view.Gravity');
var activity = new Activity(Ti.Android.currentActivity);
var Camera2Capturer = require("org.webrtc.Camera2Capturer");
var ImageView = require("android.widget.ImageView");
var SurfaceHolder = require("android.view.SurfaceHolder");
var PeerConnection = require("org.webrtc.PeerConnection");
var SdpObserver = require("org.webrtc.SdpObserver");
var List = require("java.util.List");
var localVideoTrack;
var peerConnectionFactory;
var localAudioTrack;
var remotePeer;
var localPeer;

$.index.addEventListener("open", function() {
	var permissions = ['android.permission.CAMERA', 'android.permission.READ_EXTERNAL_STORAGE'];
	var hasPermission = Ti.Android.hasPermission(permissions);
	if (hasPermission) {
		startCamera();
		return;
	}
	// no permission - request it
	Ti.Android.requestPermissions(permissions, function(e) {
		if (e.successs) {
			startCamera();
		} else {

		}
	});
});




function startCamera() {
	console.log("start camera");
	PeerConnectionFactory.initializeAndroidGlobals(activity, true, true, true);
	var rootEglBase = EglBase.create();
	var videoView = new SurfaceViewRenderer(activity);
	var options = new PeerConnectionFactory.Options();
	peerConnectionFactory = new PeerConnectionFactory(options);
	var videoCapturerAndroid = createVideoCapturer();
	audioConstraints = new MediaConstraints();
	videoConstraints = new MediaConstraints();

	peerConnectionFactory.setVideoHwAccelerationOptions(rootEglBase.getEglBaseContext(), rootEglBase.getEglBaseContext());
	var videoSource = peerConnectionFactory.createVideoSource(videoCapturerAndroid); //, videoConstraints
	localVideoTrack = peerConnectionFactory.createVideoTrack("100", videoSource);

	var audioSource = peerConnectionFactory.createAudioSource(audioConstraints);
	localAudioTrack = peerConnectionFactory.createAudioTrack("101", audioSource);

	CameraCapturer.cast(videoCapturerAndroid).startCapture(1000, 1000, 30);


	const layoutParams = new LayoutParams(ViewGroupLayoutParams.MATCH_PARENT, ViewGroupLayoutParams.MATCH_PARENT, Gravity.CENTER);
	videoView.setLayoutParams(layoutParams);

	videoView.setEnableHardwareScaler(true);
	videoView.setMirror(true);
	videoView.init(rootEglBase.getEglBaseContext(), null);
	localVideoTrack.addRenderer(new VideoRenderer(videoView));
	$.view.add(videoView);

	call()
}

function createVideoCapturer() {
	// Camera1Enumerator for <= LOLLIPOP
	var videoCapturer = createCameraCapturer(new Camera2Enumerator(activity));
	return videoCapturer;
}

function createCameraCapturer(enumerator) {
	var deviceNames = enumerator.getDeviceNames();
	var vidCap = null;

	// Trying to find a front facing camera!
	_.each(deviceNames, function(deviceName) {
		console.log(deviceName);
		console.log("front:", enumerator.isFrontFacing(deviceName));
		if (enumerator.isFrontFacing(deviceName)) {
			var videoCapturer = enumerator.createCapturer(deviceName, null);

			if (videoCapturer != null) {
				vidCap = videoCapturer;
			}
		}
	});

	if (vidCap) {
		return vidCap;
	}
	// We were not able to find a front cam. Look for other cameras
	_.each(deviceNames, function(deviceName) {
		console.log(deviceName);
		console.log("front:", enumerator.isFrontFacing(deviceName));
		if (!enumerator.isFrontFacing(deviceName)) {
			var videoCapturer = enumerator.createCapturer(deviceName, null);
			if (videoCapturer != null) {
				vidCap = videoCapturer;
			}
		}
	});

	return vidCap;
}

function call() {
	console.log("call");
	var iceServers = [];
	var sdpConstraints = new MediaConstraints();
	sdpConstraints.mandatory.add(new MediaConstraints.KeyValuePair("offerToReceiveAudio", "true"));
	sdpConstraints.mandatory.add(new MediaConstraints.KeyValuePair("offerToReceiveVideo", "true"));

	var observerLocal = new PeerConnection.Observer({
		onIceCandidate: function(iceCandidate) {
			console.log("on ice");
			onIceCandidateReceived(localPeer, iceCandidate);
		},
		onSignalingChange: function() {},
		onIceConnectionChange: function() {},
		onIceConnectionReceivingChange: function() {},
		onIceGatheringChange: function() {},
		onIceCandidatesRemoved: function() {},
		onAddStream: function() {},
		onRemoveStream: function() {},
		onDataChannel: function() {},
		onRenegotiationNeeded: function() {},
		onAddTrack: function() {}
	});
	var observerRemote = new PeerConnection.Observer({
		onIceCandidate: function(iceCandidate) {
			console.log("on ice");
			onIceCandidateReceived(remotePeer, iceCandidate);
		},
		onAddStream: function(iceCandidate) {
			console.log("on add");
		},
		onSignalingChange: function() {},
		onIceConnectionChange: function() {},
		onIceConnectionReceivingChange: function() {},
		onIceGatheringChange: function() {},
		onIceCandidatesRemoved: function() {},
		onRemoveStream: function() {},
		onDataChannel: function() {},
		onRenegotiationNeeded: function() {},
		onAddTrack: function() {}
	});
	var sdpObserverLocal = new SdpObserver({
		onCreateSuccess: function(sessionDescription) {
			console.log("set success");
			localPeer.setLocalDescription(sdpObserverLocal, sessionDescription);
		},
		onSetSuccess: function(sessionDescription) {
			console.log("set success");
			remotePeer.setRemoteDescription(sdpObserverRemote, sessionDescription);
		},
		onCreateFailure: function() {},
		onSetFailure: function() {}
	})
	var sdpObserverRemote = new SdpObserver({
		onCreateSuccess: function() {
			console.log("set success");
		},
		onSetSuccess: function() {
			console.log("set success");
		},
		onCreateFailure: function() {},
		onSetFailure: function() {}
	})

	// creating peers
	// ERROR -> not working at the moment 
	localPeer = peerConnectionFactory.createPeerConnection(iceServers, sdpConstraints, observerLocal);
	remotePeer = peerConnectionFactory.createPeerConnection(iceServers, sdpConstraints, observerRemote);

	var stream = MediaStream.cast(peerConnectionFactory.createLocalMediaStream("102"));
	stream.addTrack(localAudioTrack);
	stream.addTrack(localVideoTrack);

	if (localPeer != null) {
		localPeer.addStream(stream);
		localPeer.createOffer(sdpObserverLocal);
	} else {
		console.log("localPeer is null");
	}
}

function onIceCandidateReceived(peer, iceCandidate) {
	if (peer == localPeer) {
		remotePeer.addIceCandidate(iceCandidate);
	} else {
		localPeer.addIceCandidate(iceCandidate);
	}
}

$.index.open();
