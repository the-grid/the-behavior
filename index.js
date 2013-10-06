var noflo = require('/noflo-noflo');

exports.runGraph = function (graph, callback) {
  graph.baseDir = 'the-behavior';
  noflo.createNetwork(graph, callback);
};

exports.prepareGraph = function (instance) {
  switch (instance.type) {
    case 'drag':
      return exports.prepareDrag(instance);
  }
}

exports.prepareDrag = function (instance) {
  var graph = new noflo.Graph('Drag');
  graph.addNode('Listen', 'gestures/ListenPointer');
  graph.addNode('Direction', 'gestures/RecognizeCardinalGesture');
  graph.addInitial(instance.container, 'Listen', 'element');
  graph.addInitial(parseInt(instance.distance), 'Direction', 'distance');

  // Filtering by target
  if (instance.accept) {
    graph.addNode('EnsureTarget', 'gestures/FilterByTarget');
    graph.addEdge('Listen', 'start', 'EnsureTarget', 'started');
    graph.addEdge('Listen', 'move', 'EnsureTarget', 'move');
    graph.addInitial(instance.accept, 'EnsureTarget', 'accept');
    graph.addNode('LogTgt', 'core/Repeat');
    //graph.addEdge('EnsureTarget', 'ontarget', 'Direction', 'recognize');
    graph.addEdge('EnsureTarget', 'ontarget', 'LogTgt', 'in');
    graph.addEdge('LogTgt', 'out', 'Direction', 'recognize');
    graph.addEdge('EnsureTarget', 'startevent', 'Direction', 'started');
    graph.addEdge('EnsureTarget', 'move', 'Direction', 'moved');
  } else {
    // TODO: Set up for filterless drag (i.e. no EnsureTarget)
  }
  var cardinals = ['east', 'south', 'north', 'west'];
  var directions = instance.direction.split(' ');
  if (directions.length < 4) {
    graph.addNode('Ignored', 'core/Merge');
    graph.addNode('DropIgnored', 'core/Drop');
    graph.addEdge('Ignored', 'out', 'DropIgnored', 'in');
  }
  graph.addNode('Actionable', 'core/Merge');
  cardinals.forEach(function (dir) {
    if (directions.indexOf(dir) !== -1) {
      return;
    }
    graph.addEdge('Direction', dir, 'Ignored', 'in');
  });
  directions.forEach(function (dir) {
    graph.addEdge('Direction', dir, 'Actionable', 'in');
  });

  graph.addNode('AcceptMove', 'flow/Gate');
  graph.addEdge('Actionable', 'out', 'AcceptMove', 'open');
  graph.addEdge('Direction', 'moved', 'AcceptMove', 'in');
  graph.addNode('SplitEnd', 'core/Split');
  graph.addEdge('Listen', 'end', 'SplitEnd', 'in');
  graph.addEdge('SplitEnd', 'out', 'AcceptMove', 'close');

  switch (instance.action) {
    case 'move':
      graph.addNode('Move', 'css/MoveElement');
      graph.addEdge('AcceptMove', 'out', 'Move', 'point');
      if (instance.accept) {
        graph.addEdge('EnsureTarget', 'target', 'Move', 'element');
      } else {
        graph.addInitial(instance.container, 'Move', 'element');
      }
      break;
    case 'attributes':
      graph.addNode('GetX', 'objects/GetObjectKey');
      graph.addInitial('x', 'GetX', 'key');
      graph.addNode('GetY', 'objects/GetObjectKey');
      graph.addInitial('y', 'GetY', 'key');
      graph.addEdge('AcceptMove', 'out', 'GetX', 'in');
      graph.addEdge('GetX', 'object', 'GetY', 'in');
      graph.addNode('SetX', 'dom/SetAttribute');
      graph.addInitial('x', 'SetX', 'attribute');
      graph.addEdge('GetX', 'out', 'SetX', 'value');
      graph.addNode('SetY', 'dom/SetAttribute');
      graph.addInitial('y', 'SetY', 'attribute');
      graph.addEdge('GetY', 'out', 'SetY', 'value');
      if (instance.accept) {
        graph.addEdge('EnsureTarget', 'target', 'SetX', 'element');
      } else {
        graph.addInitial(instance.container, 'SetX', 'element');
      }
      graph.addEdge('SetX', 'element', 'SetY', 'element');
      break;
    default:
      graph.addNode('Log', 'core/Output');
      graph.addEdge('AcceptMove', 'out', 'Log', 'in');
      if (instance.accept) {
        graph.addNode('DropTarget', 'core/Drop');
        graph.addEdge('EnsureTarget', 'target', 'DropTarget', 'in');
      }
  }

  return graph;
};
