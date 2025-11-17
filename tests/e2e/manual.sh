# should print echo from js 
time tcpman localhost:9024/test_nyno_runners 'c{"apiKey":"change_me"}' 'q{"name":"Alice","i":0}'

# should print echo from php
time tcpman localhost:9024/test_nyno_runners 'c{"apiKey":"change_me"}' 'q{"name":"Alice","i":1}'

# should print echo from py
time tcpman localhost:9024/test_nyno_runners 'c{"apiKey":"change_me"}' 'q{"name":"Alice","i":2}'

# should print echo from bash
time tcpman localhost:9024/test_nyno_runners 'c{"apiKey":"change_me"}' 'q{"name":"Alice","i":3}'

# should print echo from ruby
time tcpman localhost:9024/test_nyno_runners 'c{"apiKey":"change_me"}' 'q{"name":"Alice","i":4}'
