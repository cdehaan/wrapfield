function GetCookie(cname) {
    const name = cname + "=";
    const cutCookie = decodeURIComponent(document.cookie).split(';');
    for(let i = 0; i <cutCookie.length; i++) {
      let c = cutCookie[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return null;
}

export default GetCookie