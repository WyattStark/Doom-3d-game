// Draw targets inside the map
targets.forEach(t => {
  if (!t.hit) {
    const dx = t.x + 0.5 - posX;
    const dy = t.y + 0.5 - posY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Only draw if close enough to player
    if (dist < 10) {
      // Project target into 2D screen (simple approximation)
      const angleToTarget = Math.atan2(dy, dx) - playerAngle;
      const screenX = Math.tan(angleToTarget) * canvas.width / 2 + canvas.width / 2;
      const size = 50 / dist; // scale by distance
      const screenY = canvas.height / 2 - size / 2;

      ctx.fillStyle = "yellow";
      ctx.fillRect(screenX - size/2, screenY - size/2, size, size);
    }
  }
});
