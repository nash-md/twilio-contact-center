let _context = undefined

module.exports.set = (context) => {
  _context = context
}

module.exports.get = () => {
  return  _context
}

