function textWithShadow(ctx, text, x, y, lineWidth, mainColor, shadowColor) {
    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.fillStyle = shadowColor;
    ctx.fillText(text, x + lineWidth, y + lineWidth);
    ctx.fillStyle = mainColor;
    ctx.fillText(text, x, y);
    ctx.restore();
}

function textWithOutline(ctx, text, x, y, lineWidth, mainColor, outlineColor) {
    ctx.save();
    ctx.fillStyle = mainColor;
    ctx.fillText(text, x, y);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = outlineColor;
    ctx.strokeText(text, x, y);
    ctx.restore();
}