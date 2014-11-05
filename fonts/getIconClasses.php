<?php
error_reporting(E_ALL);

$file = file('demo.htm');
$var = "";
$result = "";

for($i = 0; $i < count($file); $i++) {

  $matches = "";
  preg_match('/<span class="mls">(.*?)<\/span>/s', $file[$i], $matches);

  if(isset($matches[1]))
    $result .= $matches[1]."<br>";
  //$i = preg_replace_callback('##', function($t) { global $result; print_r($t); $result .= $t[0]."\n";return $t; }, $i);
}

echo $result;

?>
