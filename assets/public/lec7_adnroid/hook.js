Java.perform(
    function(){
        console.log('Started');
        Java.choose('com.android.insecurebankv2.CryptoClass',
        { onMatch : function(instance){
                console.log('Intances: '+instance);
                console.log('Decryption: '+instance.aesDeccryptedString('DTrW2VXjSoFdg0e61fHxJg=='));
            },
            onComplete : function(){console.log('end')}
        }
        )
    }
);