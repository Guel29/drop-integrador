<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/api/lib.php';require __DIR__.'/api/mercado.php';
try{$result=process_queue(5);echo json_encode($result).PHP_EOL;}catch(Throwable){fwrite(STDERR,"SMARTDROP_CRON_FAILED\n");exit(1);}
