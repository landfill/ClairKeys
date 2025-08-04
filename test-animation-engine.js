// Simple test to verify animation engine functionality
const { AnimationEngine, getAnimationEngine } = require('./src/services/animationEngine.ts');

console.log('Testing animation engine...');

try {
  const engine = getAnimationEngine();
  console.log('✓ Animation engine created successfully');
  
  const testData = {
    version: '1.0',
    title: 'Test Song',
    composer: 'Test Composer',
    duration: 10,
    tempo: 120,
    timeSignature: '4/4',
    notes: [
      {
        note: 'C4',
        startTime: 0,
        duration: 1,
        velocity: 0.8
      }
    ],
    metadata: {
      originalFileName: 'test.pdf',
      fileSize: 1024,
      processedAt: new Date().toISOString()
    }
  };
  
  engine.loadAnimation(testData);
  console.log('✓ Animation data loaded successfully');
  
  const state = engine.getState();
  console.log('✓ Engine state:', state);
  
} catch (error) {
  console.error('✗ Error:', error.message);
}