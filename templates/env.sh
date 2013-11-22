<% for(var key in env) { %>
  export <%= key %>=<%= env[key] %>
<% } %>