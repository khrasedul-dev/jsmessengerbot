export default function logger() {
  return async (ctx, next) => {
    console.log('Received event:', ctx.event)
    await next()
  }
}
